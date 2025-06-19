'use strict';

const dotenv = require('dotenv');
dotenv.config({
  path: __dirname + '/.env'
});

module.exports = {
  apps: [
    // API service
    {
      name: 'webhook-api',
      script: './bin/api.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.LISTEN_PORT || 8800,
        LISTEN_HOST: process.env.LISTEN_HOST || '0.0.0.0'
      },
      error_file: './logs/webhook-api-error.log',
      out_file: './logs/webhook-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    // Consumer service
    {
      name: 'webhook-consumer',
      script: './bin/consumer.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/webhook-consumer-error.log',
      out_file: './logs/webhook-consumer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
};
