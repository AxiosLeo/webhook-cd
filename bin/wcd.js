#!/usr/bin/env node

'use strict';

require('dotenv').config();
const { App } = require('@axiosleo/cli-tool');
const path = require('path');

const pkg = require('../package.json');

const app = new App({
  name: pkg.name,
  version: pkg.version,
  desc: 'continuous deployment webhook cli',
  commands_dir: path.join(__dirname, '../commands')
});

app.start();
