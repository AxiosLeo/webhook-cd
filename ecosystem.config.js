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
      script: 'npm',
      args: 'run dev',
      // env: process.env
    },
  ]
};
