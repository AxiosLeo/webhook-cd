# Webhook-CD: 基于 Webhook 的持续部署工具

[English](README.md) | 简体中文

[![NPM version](https://img.shields.io/npm/v/@axiosleo/webhook-cd.svg?style=flat-square)](https://npmjs.org/package/@axiosleo/webhook-cd)
[![npm download](https://img.shields.io/npm/dm/@axiosleo/webhook-cd.svg?style=flat-square)](https://npmjs.org/package/@axiosleo/webhook-cd)
[![node version](https://img.shields.io/badge/node.js-%3E=_18.0-green.svg?style=flat-square)](http://nodejs.org/download/)
[![License](https://img.shields.io/github/license/AxiosLeo/webhook-cd?color=%234bc524)](LICENSE)

> **⚠️ 重要警告 / IMPORTANT WARNING**
>
> **🚫 本工具严禁在生产环境中使用！仅限开发环境使用！**
>
> **🚫 DO NOT USE THIS TOOL IN PRODUCTION ENVIRONMENTS! DEVELOPMENT USE ONLY!**
>
> 此工具为开发阶段的自动化部署工具，未经过生产环境的安全性和稳定性验证。在生产环境中使用可能导致数据丢失、服务中断或安全风险。
>
> This tool is designed for development automation and has not been validated for production security and stability. Using it in production may result in data loss, service interruption, or security risks.

Webhook-CD 是一个通过监听来自 Coding.net 和 GitHub 平台的 webhook 来自动化持续部署工作流的工具。它处理 Git 合并请求/拉取请求事件，以触发已配置仓库的部署操作。

## 概述

系统工作原理：

1. **监听 Webhook**：HTTP 服务器监听来自 Coding.net 和 GitHub 的 webhook 事件，特别是与合并请求/拉取请求相关的事件（创建、更新、合并、关闭）。
2. **自动化部署**：基于仓库配置，工具监控可部署事件（如合并的合并请求/拉取请求）。当为已配置的仓库和分支发生此类事件时，它会在指定的本地目录中执行 Git 操作（例如 checkout、pull）来部署更改。
3. **CLI 手动控制**：提供命令行界面（CLI）工具 `wcd`，用于手动任务检查和触发。

## 功能特性

- 与 Coding.net 和 GitHub 的 Webhook 集成（用于合并请求/拉取请求事件）
- 基于 webhook 触发器的自动化 Git 操作部署
- 与 RabbitMQ 的消息队列集成，确保任务处理的可靠性
- 通过环境变量进行配置，提供灵活性
- CLI 工具（`wcd`）用于手动交互和任务管理

## 环境要求

- Node.js 和 npm
- 访问您希望部署的 Coding.net 和/或 GitHub 仓库的权限
- RabbitMQ 服务器（推荐：在开发环境中使用 Docker）
- Docker（可选，用于在开发中运行 RabbitMQ）

## 安装和配置

### 1. 克隆仓库

```bash
git clone <repository-url>
cd webhook-cd
```

### 2. 配置环境变量

应用程序使用环境变量进行配置。在项目根目录创建 `.env` 文件或在部署环境中设置这些变量。

**RabbitMQ 配置：**

- `RABBITMQ_HOST`：RabbitMQ 服务器的主机名（默认：`localhost`）
- `RABBITMQ_PORT`：RabbitMQ 端口（默认：`5672`）
- `RABBITMQ_USER`：RabbitMQ 用户名（默认：`guest`）
- `RABBITMQ_PASS`：RabbitMQ 密码（默认：`guest`）

**Coding.net 配置：**

- `CODING_USER`：您的 Coding.net 用户名
- `CODING_TOKEN`：您的 Coding.net 用户令牌，用于 API 访问

**GitHub 配置：**

- `GITHUB_USER`：您的 GitHub 用户名
- `GITHUB_TOKEN`：您的 GitHub 个人访问令牌，用于 API 访问
- `GITHUB_WEBHOOK_SECRET`：（可选）用于 webhook 签名验证的密钥令牌

**应用程序配置：**

- `WORKSPACE`：（可选）基础工作区目录。默认为相对于应用程序根目录的 `runtime/repos`
- `LISTEN_HOST`：webhook 监听器的主机（默认：`0.0.0.0`）
- `LISTEN_PORT`：webhook 监听器运行的端口（默认：`8800`）

### 3. 启动 RabbitMQ（开发环境）

对于开发环境，您可以使用 Docker 轻松启动 RabbitMQ 容器：

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=guest \
  -e RABBITMQ_DEFAULT_PASS=guest \
  rabbitmq:3-management
```

这将启动 RabbitMQ，包含：

- AMQP 端口：`5672`
- 管理界面：`http://localhost:15672`（用户名：`guest`，密码：`guest`）

或者，项目包含一个预配置的 `docker-compose.yml` 文件，其中包含 RabbitMQ。您可以使用：

```bash
docker-compose up -d
```

### 4. 配置 PM2 日志轮转

为了防止日志文件过大并消耗过多磁盘空间，项目使用 PM2 的日志轮转功能。以下是设置方法：

1. 安装 PM2 日志轮转模块：

```bash
pm2 install pm2-logrotate
```

2. 配置全局日志轮转设置：

```bash
pm2 set pm2-logrotate:max_size 100M        # 每个日志文件的最大大小
pm2 set pm2-logrotate:retain 7             # 保留日志的天数
pm2 set pm2-logrotate:compress true        # 压缩轮转的日志
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss  # 轮转日志的日期格式
pm2 set pm2-logrotate:workerInterval 30    # 检查间隔（秒）
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # 每天午夜轮转
pm2 set pm2-logrotate:rotateModule true    # 启用模块轮转
```

3. 验证配置：

```bash
pm2 conf pm2-logrotate
```

日志轮转配置将：

- 当日志达到 100MB 或每天午夜时轮转日志
- 保留日志 7 天
- 压缩旧日志以节省空间
- 在 `logs` 目录中存储带时间戳的日志
- 自动清理旧日志

### 5. 安装依赖并运行应用程序

```bash
npm install
npm start
```

或者，对于带有自动重新加载的开发：

```bash
npm run dev
```

## Docker 部署

应用程序支持 Docker 容器化，为不同的服务提供灵活的部署选项。

### 1. 构建 Docker 镜像

```bash
docker build -t webhook-cd .
```

### 2. 容器启动选项

Docker 镜像支持基于 `MAIN_BIN` 环境变量运行两种不同的服务：

- `MAIN_BIN=api`：运行 webhook API 服务器（`./bin/api.js`）
- `MAIN_BIN=consumer`：运行消息队列消费者（`./bin/consumer.js`）

### 3. 运行 API 服务器容器

API 服务器监听 webhook 并默认在端口 8800 上运行：

```bash
# 使用环境文件运行
docker run --env-file .env -e MAIN_BIN=api -p 8800:8800 webhook-cd

# 或使用显式环境变量
docker run -e MAIN_BIN=api \
  -e LISTEN_HOST=0.0.0.0 \
  -e LISTEN_PORT=8800 \
  -e RABBITMQ_HOST=your_rabbitmq_host \
  -e CODING_USER=your_username \
  -e CODING_TOKEN=your_token \
  -e GITHUB_USER=your_github_username \
  -e GITHUB_TOKEN=your_github_token \
  -p 8800:8800 \
  webhook-cd
```

### 4. 运行消费者容器

消费者处理来自 RabbitMQ 队列的消息：

```bash
# 使用环境文件运行
docker run --env-file .env -e MAIN_BIN=consumer webhook-cd

# 或使用显式环境变量
docker run -e MAIN_BIN=consumer \
  -e RABBITMQ_HOST=your_rabbitmq_host \
  -e RABBITMQ_USER=guest \
  -e RABBITMQ_PASS=guest \
  -e CODING_USER=your_username \
  -e CODING_TOKEN=your_token \
  -e GITHUB_USER=your_github_username \
  -e GITHUB_TOKEN=your_github_token \
  webhook-cd
```

### 5. Docker Compose 示例

创建 `docker-compose.override.yml` 文件进行完整部署：

```yaml
version: "3.8"

services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest

  webhook-api:
    build: .
    ports:
      - "8800:8800"
    environment:
      - MAIN_BIN=api
    env_file:
      - .env
    depends_on:
      - rabbitmq

  webhook-consumer:
    build: .
    environment:
      - MAIN_BIN=consumer
    env_file:
      - .env
    depends_on:
      - rabbitmq
```

然后运行：

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 6. Docker 环境变量

在 Docker 中运行时，确保您的 `.env` 文件或环境变量包含：

```bash
# RabbitMQ 配置
RABBITMQ_HOST=localhost  # 或您的 RabbitMQ 容器名称
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# Coding.net 配置
CODING_USER=your_username
CODING_TOKEN=your_token

# GitHub 配置
GITHUB_USER=your_username
GITHUB_TOKEN=your_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# 应用程序配置
WORKSPACE=/app/runtime/repos  # 容器路径
LISTEN_HOST=0.0.0.0
LISTEN_PORT=8800
```

### 7. 持久化数据的卷挂载

如果您需要在容器重启时保持仓库数据：

```bash
docker run --env-file .env \
  -e MAIN_BIN=api \
  -p 8800:8800 \
  -v $(pwd)/runtime:/app/runtime \
  webhook-cd
```

## 使用方法

### 1. 配置 Webhook

#### 对于 Coding.net 项目

对于您想要集成的每个 Coding.net 项目：

1. 转到 Coding.net 中的项目设置
2. 找到"Webhooks"部分
3. 添加一个新的 webhook，包含以下详细信息：
   - **负载 URL**：`http://<your_server_address>:<PORT>/{platform}/{team}/{project}`
     - 将 `<your_server_address>` 替换为运行 Webhook-CD 的 IP 或主机名
     - 将 `<PORT>` 替换为 Webhook-CD 监听的端口（例如 `8800`）
     - 将 `{platform}`、`{team}` 和 `{project}` 替换为实际的平台标识符（例如 `coding`）、您的团队名称和项目名称
   - **内容类型**：`application/json`
   - **密钥令牌**：（可选但推荐）如果您设置了密钥令牌，您需要修改应用程序来验证它。当前的应用程序主要检查 `User-Agent`
   - **事件**：选择您想要触发 webhook 的事件。此工具主要为"合并请求"事件设计（Push、Opened、Merged、Closed、Commented）
   - 确保 webhook 处于活动状态

**重要**：应用程序当前通过检查 `User-Agent` 头是否为 `Coding.net Hook` 来验证 Coding.net webhook。

#### 对于 GitHub 项目

对于您想要集成的每个 GitHub 仓库：

1. 转到 GitHub 上的仓库设置
2. 导航到"Settings" > "Webhooks" > "Add webhook"
3. 使用以下详细信息配置 webhook：
   - **负载 URL**：`http://<your_server_address>:<PORT>/github/{owner}/{repo}`
     - 将 `<your_server_address>` 替换为运行 Webhook-CD 的 IP 或主机名
     - 将 `<PORT>` 替换为 Webhook-CD 监听的端口（例如 `8800`）
     - 将 `{owner}` 和 `{repo}` 替换为您的 GitHub 用户名/组织和仓库名称
   - **内容类型**：`application/json`
   - **密钥**：（可选但推荐）使用与 `GITHUB_WEBHOOK_SECRET` 环境变量相同的值进行签名验证
   - **事件**：选择"Pull requests"以在拉取请求事件（opened、synchronized、closed）时触发
   - **活动**：确保 webhook 处于活动状态

**重要**：当配置了密钥时，GitHub webhook 支持使用 HMAC-SHA256 的签名验证。

### 2. 部署工作原理

1. 当为受监控的仓库和分支在 Coding.net 或 GitHub 中发生配置的事件（例如合并请求被合并）时，平台会向您的 Webhook-CD 实例发送 webhook
2. Webhook-CD 处理事件并触发适当的部署操作
3. 系统监控已配置仓库的可部署事件
4. 如果找到可部署事件，Webhook-CD 将尝试在相应的本地目录中执行 Git 操作（如 `git checkout`、`git reset --hard origin/{branch}`、`git pull`）。确保此目录存在并正确初始化为 Git 仓库，或者是工具可以克隆到的位置

## CLI 工具（`wcd`）

项目包含一个名为 `wcd` 的 CLI 工具（在 `package.json` 的 `bin` 字段中定义）。

**安装（如果通过 `npm install` 不可用）：**
如果在 `npm install` 后未全局安装，您可能需要全局链接它或通过 `npx` 运行它。

```bash
npm link # 如果您想直接使用 'wcd'
# 或通过 npx 运行
npx @axiosleo/webhook-cd --help
```

**可用命令：**
CLI 允许您手动触发内部事件系统。这对于测试或重新处理任务很有用。命令在 `commands/` 目录中定义。

- `wcd push <project> <repo> [options]`：模拟 `GIT_MR_CREATED` 事件（注意：文件 `commands/push.js` 可能有命名错误，将自己称为 'pop'）
- `wcd refresh <project> <repo> [options]`：模拟 `GIT_MR_UPDATED` 事件（注意：文件 `commands/refresh.js` 可能有命名错误）
- `wcd pop <project> <repo> [options]`：模拟 `GIT_MR_CLOSED` 事件

**CLI 命令的通用选项：**

- `--platform <name>`：平台名称（默认：`coding`）
- `-s, --source <branch>`：源分支（默认：`master`）
- `-t, --target <branch>`：目标分支（默认：`master`）

示例：

```bash
wcd pop myteam myawesomeproject myfrontendapp --source dev-branch
```

## 许可证

本项目采用 MIT 许可证。详情请参见 `LICENSE` 文件。
