# 使用基础的 Node.js Alpine 镜像，体积更小
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package.json ./

# 安装依赖
RUN npm install --only=production && npm cache clean --force

# 复制必要的项目文件
COPY bin/ ./bin/
COPY src/ ./src/
COPY config.js ./
COPY index.d.ts ./

# 设置默认的环境变量
ENV MAIN_BIN=api

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'if [ "$MAIN_BIN" = "api" ]; then' >> /app/entrypoint.sh && \
    echo '  exec node ./bin/api.js "$@"' >> /app/entrypoint.sh && \
    echo 'elif [ "$MAIN_BIN" = "consumer" ]; then' >> /app/entrypoint.sh && \
    echo '  exec node ./bin/consumer.js "$@"' >> /app/entrypoint.sh && \
    echo 'else' >> /app/entrypoint.sh && \
    echo '  echo "Error: MAIN_BIN must be either \"api\" or \"consumer\""' >> /app/entrypoint.sh && \
    echo '  exit 1' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# 暴露端口（API 服务可能需要）
EXPOSE 3000

# 设置入口点
ENTRYPOINT ["/app/entrypoint.sh"]
