'use strict';

const dotenv = require('dotenv');
dotenv.config({
  path: __dirname + '/.env'
});
module.exports = {
  apps: [
    // services dev mode
    {
      name: 'webhook',
      script: 'node',
      args: 'index.js',
      env: process.env
    },
  ]
};
