'use strict';

require('dotenv').config();
const path = require('path');

module.exports = {
  workspace: process.env.WORKSPACE ? path.resolve(process.env.WORKSPACE) :
    path.join(__dirname, 'runtime/repos'),
  rabbit: {
    topic: 'deploy-queue',
    exchange: 'webhook-events',
    user: process.env.RABBITMQ_USER || 'guest',
    pass: process.env.RABBITMQ_PASS || 'guest',
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: process.env.RABBITMQ_PORT || 5672,
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || 'password',
    port: Number(process.env.MYSQL_PORT || '23306'),
    database: process.env.MYSQL_DB || 'webhook'
  },
  coding: {
    user_token: process.env.CODING_USER_TOKEN || '',
    client_id: process.env.CODING_CLIENT_ID || '',
    client_secret: process.env.CODING_CLIENT_SECRET || '',
  }
};
