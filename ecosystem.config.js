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
      script: 'nodemon',
      env: process.env
    },
  ]
};
