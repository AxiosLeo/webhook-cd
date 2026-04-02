'use strict';

const path = require('path');
const { debug } = require('@axiosleo/cli-tool');
const { _exec } = require('@axiosleo/cli-tool/src/helper/cmd');
const git = require('./git');
const { printer } = require('@axiosleo/cli-tool');
const { _exists, _mkdir } = require('@axiosleo/cli-tool/src/helper/fs');
const { _yaml } = require('./utils');
const config = require('../config');
const Deployment = require('./deploy');

/**
 * 检查是否有分支冲突的情况
 * @param {import('../index.d.ts').Context} context
 */
async function init(context) {
  printer.warning('-'.repeat(100));
  let { platform, task } = context;
  if (!config.platforms.includes(platform)) {
    throw new Error('不支持的平台: ' + platform);
  }
  const PlatformHandlerClass = require(`./platform/${platform}`);
  /** @type {import('../index.d.ts').PlatformHandler} */
  const platformHandler = new PlatformHandlerClass();
  let defaultBranch = await platformHandler.getDefaultBranch(task);
  if (task.target !== defaultBranch && task.target !== 'refs/heads/' + defaultBranch) {
    printer.print('目标分支: ').yellow(task.target).println(' 不是默认分支: ' + defaultBranch);
    return 'end';
  }
  const cwd = path.join(config.workspace, `./${task.repo}`);

  if (!await _exists(config.workspace)) {
    await _mkdir(config.workspace);
  }
  printer.print('CWD: ').yellow(cwd).println();

  // 如果仓库目录不存在，则克隆仓库
  if (!await _exists(context.cwd)) {
    let httpsLink = platformHandler.getCloneLink(task);
    await _exec(`git clone ${httpsLink} ${context.cwd}`, context.workspace);
  } else {
    await git.branch.reset(task.target, context.cwd);
  }
  const ymlConfigFile = path.join(cwd, '.cd.yml');
  if (!await _exists(ymlConfigFile)) {
    printer.warning('没有找到 .cd.yml 文件，请检查文件是否存在');
    return 'end';
  }
  const ymlConfig = await _yaml(ymlConfigFile);
  context.deploy = new Deployment(platformHandler, {
    workspace: config.workspace,
    cwd,
    target: task.target,
    repo: task.repo,
    platform: platform,
    task: task,
    status: 'wait',
    deployConfig: ymlConfig
  });
}

/**
 * 执行部署
 * @param {import('../index.d.ts').Context} context 
 * @returns 
 */
async function run(context) {
  try {
    context.jobs = await context.deploy.resolveJobs();
    context.success = await context.deploy.execJobs();
  } catch (err) {
    debug.log(err);
    context.success = false;
    context.error = err;
    return 'end';
  }
}

/**
 * 结束部署
 * @param {import('../index.d.ts').Context} context 
 */
async function end(context) {
  printer.warning('-'.repeat(100));
  if (context.success) {
    printer.print('Deploy ').green('success').println('!');
  } else {
    printer.print('Deploy ').red('failed').println('!');
  }
}

module.exports = {
  init,
  run,
  end,
};
