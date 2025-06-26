# Webhook-CD: Continuous Deployment via Webhooks for Coding.net

> **⚠️ 重要警告 / IMPORTANT WARNING**
>
> **🚫 本工具严禁在生产环境中使用！仅限开发环境使用！**
>
> **🚫 DO NOT USE THIS TOOL IN PRODUCTION ENVIRONMENTS! DEVELOPMENT USE ONLY!**
>
> 此工具为开发阶段的自动化部署工具，未经过生产环境的安全性和稳定性验证。在生产环境中使用可能导致数据丢失、服务中断或安全风险。
>
> This tool is designed for development automation and has not been validated for production security and stability. Using it in production may result in data loss, service interruption, or security risks.

Webhook-CD is a tool designed to automate continuous deployment workflows by listening to webhooks, primarily from Coding.net. It processes Git merge request events to trigger deployment actions on configured repositories.

## Overview

The system works by:

1. **Listening for Webhooks**: An HTTP server listens for incoming webhook events from Coding.net, specifically related to merge requests (created, updated, merged, closed).
2. **Automated Deployments**: Based on repository configurations, the tool monitors for deployable events (like a merged merge request). When such an event occurs for a configured repository and branch, it performs Git operations (e.g., checkout, pull) in a specified local directory to deploy the changes.
3. **CLI for Manual Control**: A command-line interface (CLI) tool, `wcd`, is provided for manual task inspection and triggering.

## Features

- Webhook integration with Coding.net (specifically for Merge Request events).
- Automated Git operations for deployment based on webhook triggers.
- Message queue integration with RabbitMQ for reliable task processing.
- Configuration via environment variables for flexibility.
- CLI tool (`wcd`) for manual interaction and task management.

## Prerequisites

- Node.js and npm
- Access to a Coding.net instance and repositories you wish to deploy.
- RabbitMQ server (recommended: use Docker for development environment)
- Docker (optional, for running RabbitMQ in development)

## Setup & Configuration

### 1. Clone the Repository

```bash
git clone <repository-url>
cd webhook-cd
```

### 2. Configure Environment Variables

The application uses environment variables for its configuration. Create a `.env` file in the root of the project or set these variables in your deployment environment.

**RabbitMQ Configuration:**

- `RABBITMQ_HOST`: Hostname of your RabbitMQ server (default: `localhost`).
- `RABBITMQ_PORT`: Port for RabbitMQ (default: `5672`).
- `RABBITMQ_USER`: RabbitMQ username (default: `guest`).
- `RABBITMQ_PASS`: RabbitMQ password (default: `guest`).

**Coding.net Configuration:**

- `CODING_USER`: Your Coding.net username.
- `CODING_USERTOKEN`: Your Coding.net user token for API access.

**Application Configuration:**

- `WORKSPACE`: (Optional) The base workspace directory. Defaults to `runtime/repos` relative to the application root.
- `LISTEN_HOST`: Host for the webhook listener (default: `0.0.0.0`).
- `LISTEN_PORT`: Port for the webhook listener to run on (default: `8800`).

### 3. Start RabbitMQ (Development Environment)

For development, you can easily start a RabbitMQ container using Docker:

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  rabbitmq:3-management
```

This will start RabbitMQ with:

- AMQP port: `5672`
- Management UI: `http://localhost:15672` (username: `guest`, password: `guest`)

Alternatively, the project includes a pre-configured `docker-compose.yml` file with RabbitMQ. You can use:

```bash
docker-compose up -d
```

### 4. Configure PM2 Log Rotation

To prevent log files from growing too large and consuming excessive disk space, the project uses PM2's log rotation feature. Here's how to set it up:

1. Install the PM2 log rotation module:

```bash
pm2 install pm2-logrotate
```

2. Configure global log rotation settings:

```bash
pm2 set pm2-logrotate:max_size 100M        # Maximum size of each log file
pm2 set pm2-logrotate:retain 7             # Number of days to keep logs
pm2 set pm2-logrotate:compress true        # Compress rotated logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss  # Date format for rotated logs
pm2 set pm2-logrotate:workerInterval 30    # Check interval in seconds
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Daily rotation at midnight
pm2 set pm2-logrotate:rotateModule true    # Enable module rotation
```

3. Verify the configuration:

```bash
pm2 conf pm2-logrotate
```

The log rotation configuration will:

- Rotate logs when they reach 100MB or at midnight each day
- Keep logs for 7 days
- Compress old logs to save space
- Store logs in the `logs` directory with timestamps
- Automatically clean up old logs

### 5. Install Dependencies & Run the Application

```bash
npm install
npm start
```

Or, for development with auto-reloading:

```bash
npm run dev
```

## Usage

### 1. Configure Webhooks in Coding.net

For each project in Coding.net that you want to integrate:

1. Go to your project settings in Coding.net.
2. Find the "Webhooks" section.
3. Add a new webhook with the following details:
   - **Payload URL**: `http://<your_server_address>:<PORT>/{platform}/{team}/{project}`
     - Replace `<your_server_address>` with the IP or hostname where Webhook-CD is running.
     - Replace `<PORT>` with the port Webhook-CD is listening on (e.g., `8800`).
     - Replace `{platform}`, `{team}`, and `{project}` with the actual platform identifier (e.g., `coding`), your team name, and your project name respectively.
   - **Content type**: `application/json`
   - **Secret Token**: (Optional but recommended) If you set a secret token, you will need to modify the application to validate it. The current `index.js` primarily checks the `User-Agent`.
   - **Events**: Select the events you want to trigger the webhook. This tool is primarily designed for "Merge Request" events (Push, Opened, Merged, Closed, Commented).
   - Ensure the webhook is active.

**Important**: The application currently authenticates webhooks by checking if the `User-Agent` header is `Coding.net Hook`.

### 2. How Deployments Work

1. When a configured event (e.g., a merge request is merged) occurs in Coding.net for a monitored repository and branch, Coding.net sends a webhook to your Webhook-CD instance.
2. Webhook-CD processes the event and triggers the appropriate deployment actions.
3. The system monitors for deployable events for the configured repositories.
4. If a deployable event is found, Webhook-CD will attempt to perform Git operations (like `git checkout`, `git reset --hard origin/{branch}`, `git pull`) in the corresponding local directory. Ensure this directory exists and is properly initialized as a Git repository, or is a location where the tool can clone into.

## CLI Tool (`wcd`)

The project includes a CLI tool named `wcd` (defined in `package.json`'s `bin` field).

**Installation (if not already available via `npm install`):**
You might need to link it globally or run it via `npx` if not installed globally after `npm install`.

```bash
npm link # if you want to use 'wcd' directly
# or run via npx
npx @axiosleo/webhook-cd --help
```

**Available Commands:**
The CLI allows you to manually trigger the internal event system. This can be useful for testing or re-processing tasks. The commands are defined in the `commands/` directory.

- `wcd push <project> <repo> [options]`: Simulates a `GIT_MR_CREATED` event. (Note: The file `commands/push.js` might have a naming error, referring to itself as 'pop').
- `wcd refresh <project> <repo> [options]`: Simulates a `GIT_MR_UPDATED` event. (Note: The file `commands/refresh.js` might have a naming error).
- `wcd pop <project> <repo> [options]`: Simulates a `GIT_MR_CLOSED` event.

**Common Options for CLI commands:**

- `--platform <name>`: Platform name (default: `coding`).
- `-s, --source <branch>`: Source branch (default: `master`).
- `-t, --target <branch>`: Target branch (default: `master`).

Example:

```bash
wcd pop myteam myawesomeproject myfrontendapp --source dev-branch
```

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
