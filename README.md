# Webhook-CD: Continuous Deployment via Webhooks for Coding.net

Webhook-CD is a tool designed to automate continuous deployment workflows by listening to webhooks, primarily from Coding.net. It processes Git merge request events to trigger deployment actions on configured repositories.

## Overview

The system works by:

1.  **Listening for Webhooks**: An HTTP server listens for incoming webhook events from Coding.net, specifically related to merge requests (created, updated, merged, closed).
2.  **Logging & Task Tracking**: Received webhook data is logged into a MySQL database, and the status of associated tasks (e.g., merge requests) is tracked.
3.  **Automated Deployments**: Based on repository configurations (defined via environment variables), the tool monitors for deployable events (like a merged merge request). When such an event occurs for a configured repository and branch, it performs Git operations (e.g., checkout, pull) in a specified local directory to deploy the changes.
4.  **CLI for Manual Control**: A command-line interface (CLI) tool, `wcd`, is provided for manual task inspection and triggering.

## Features

- Webhook integration with Coding.net (specifically for Merge Request events).
- Automated Git operations for deployment based on webhook triggers.
- Database logging of webhook events and task statuses (MySQL).
- Configuration via environment variables for flexibility.
- Dockerized setup for easy deployment of dependencies (MySQL, Redis).
- CLI tool (`wcd`) for manual interaction and task management.

## Prerequisites

- Docker and Docker Compose
- Node.js and npm (for running locally outside Docker or for development)
- Access to a Coding.net instance and repositories you wish to deploy.
- A MySQL server (can be run via the provided `docker-compose.yml`).
- A Redis server (can be run via the provided `docker-compose.yml`).

## Setup & Configuration

### 1. Clone the Repository

```bash
git clone <repository-url>
cd webhook-cd
```

### 2. Configure Environment Variables

The application uses environment variables for its configuration. Create a `.env` file in the root of the project or set these variables in your deployment environment.

**Database Configuration (MySQL):**

- `MYSQL_HOST`: Hostname of your MySQL server (e.g., `localhost` or `webhook-mysql` if using Docker Compose).
- `MYSQL_PORT`: Port for MySQL (default: `23306` as per `docker-compose.yml`, or `3306` for standard MySQL).
- `MYSQL_USER`: MySQL username (e.g., `root`).
- `MYSQL_PASS`: MySQL password (e.g., `3Uh6jScdSJ` as per `docker-compose.yml`).
- `MYSQL_DB`: MySQL database name (e.g., `webhook` as per `docker-compose.yml`).

**Application Configuration:**

- `WEBHOOK_CD_WORKSPACE`: (Optional) The base workspace directory. Defaults to a path relative to the application.
- `PORT`: Port for the webhook listener to run on (default: `8800`).
- `LISTEN_HOST`: Host for the webhook listener (default: `0.0.0.0`).

**Repository Deployment Configuration:**
For each repository and branch you want to manage for automated deployments, define the following environment variables:

- `WEBHOOK_CD_REPO_{PLATFORM}_{PROJECT}_{REPO}_{BRANCH}`: Specifies the repository and branch to monitor.
  - Example: `WEBHOOK_CD_REPO_coding_myteam_mywebapp_master=coding::myteam::mywebapp::master`
  - The value format is `{platform}::{project}::{repo_name}::{branch_name}`.
- `WEBHOOK_CD_REPO_{PLATFORM}_{PROJECT}_{REPO}_DIR`: Specifies the local directory path where the Git operations for this repository should be performed.
  - Example: `WEBHOOK_CD_REPO_coding_myteam_mywebapp_DIR=/path/to/mywebapp/deployment`
  - If this is not set, it defaults to the repository name. This directory should be an existing Git repository, or a directory where the repository can be cloned and managed by this tool.

### 3. Start Services (Docker)

The easiest way to get MySQL and Redis running is via Docker Compose:

```bash
docker-compose up -d
```

This will start MySQL on port `23306` and Redis on port `23679` (as mapped in `docker-compose.yml`).

### 4. Install Dependencies & Run the Application

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

1.  Go to your project settings in Coding.net.
2.  Find the "Webhooks" section.
3.  Add a new webhook with the following details:
    - **Payload URL**: `http://<your_server_address>:<PORT>/{platform}/{project}`
      - Replace `<your_server_address>` with the IP or hostname where Webhook-CD is running.
      - Replace `<PORT>` with the port Webhook-CD is listening on (e.g., `8800`).
      - Replace `{platform}` and `{project}` with the actual platform identifier (e.g., `coding`) and your project name as used in your environment variable configurations.
    - **Content type**: `application/json`
    - **Secret Token**: (Optional but recommended) If you set a secret token, you will need to modify the application to validate it. The current `index.js` primarily checks the `User-Agent`.
    - **Events**: Select the events you want to trigger the webhook. This tool is primarily designed for "Merge Request" events (Push, Opened, Merged, Closed, Commented).
    - Ensure the webhook is active.

**Important**: The application currently authenticates webhooks by checking if the `User-Agent` header is `Coding.net Hook`.

### 2. How Deployments Work

1.  When a configured event (e.g., a merge request is merged) occurs in Coding.net for a monitored repository and branch (as defined in your `WEBHOOK_CD_REPO_...` environment variables), Coding.net sends a webhook to your Webhook-CD instance.
2.  Webhook-CD logs the event and updates the status in its database.
3.  The `runTasks` process in `index.js` periodically checks for new, undeployed events for the configured repositories.
4.  If a deployable event is found, Webhook-CD will attempt to perform Git operations (like `git checkout`, `git reset --hard origin/{branch}`, `git pull`) in the corresponding local directory specified by `WEBHOOK_CD_REPO_..._DIR`. Ensure this directory exists and is properly initialized as a Git repository, or is a location where the tool can clone into.

## CLI Tool (`wcd`)

The project includes a CLI tool named `wcd` (defined in `package.json`'s `bin` field).

**Installation (if not already available via `npm install`):**
You might need to link it globally or run it via `npx` if not installed globally after `npm install`.

```bash
npm link # if you want to use 'wcd' directly
# or run via npx
npx wcd --help
```

**Available Commands:**
The CLI allows you to manually trigger the internal event system. This can be useful for testing or re-processing tasks. The commands are defined in the `commands/` directory.

- `wcd pop <project> <repo> [options]`: Simulates a `GIT_MR_CLOSED` event.
- `wcd push <project> <repo> [options]`: Simulates a `GIT_MR_CREATED` event. (Note: The file `commands/push.js` might have a naming error, referring to itself as 'pop').
- `wcd refresh <project> <repo> [options]`: Simulates a `GIT_MR_UPDATED` event. (Note: The file `commands/refresh.js` might have a naming error).

**Common Options for CLI commands:**

- `--platform <name>`: Platform name (default: `coding`).
- `-s, --source <branch>`: Source branch (default: `master`).
- `-t, --target <branch>`: Target branch (default: `master`).

Example:

```bash
wcd pop myawesomeproject myfrontendapp -t development
```

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
