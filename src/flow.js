'use strict';

const path = require('path');
const { debug } = require('@axiosleo/cli-tool');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const git = require('./git');
const { printer } = require('@axiosleo/cli-tool');
const { _exists, _mkdir } = require('@axiosleo/cli-tool/src/helper/fs');
const { _yaml } = require('./utils');
const is = require('@axiosleo/cli-tool/src/helper/is');
const config = require('../config');

/**
 * 通配符匹配函数
 * @param {string} pattern - 模式字符串，支持 * 通配符
 * @param {string} str - 要匹配的字符串
 * @returns {boolean} 是否匹配
 */
function wildcardMatch(pattern, str) {
  // 将通配符模式转换为正则表达式
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\\\*/g, '.*'); // 将 \* 替换为 .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

/**
 * 判断分支是否匹配分支模式列表
 * @param {string} branchName - 分支名称
 * @param {string[]} patterns - 分支模式列表
 * @returns {boolean} 是否匹配
 */
function matchesBranchPatterns(branchName, patterns) {
  if (!patterns || !Array.isArray(patterns)) {
    return false;
  }

  // 移除 refs/heads/ 前缀（如果存在）
  const cleanBranchName = branchName.replace(/^refs\/heads\//, '');

  return patterns.some(pattern => wildcardMatch(pattern, cleanBranchName));
}

/**
 * @typedef {Object} Task
 * @property {string} team - 团队名称
 * @property {string} project - 项目名称  
 * @property {string} repo - 仓库名称
 * @property {string} target - 目标分支
 */

/**
 * @typedef {Object} PlatformHandler
 * @property {function(Task): string} getCloneLink - 获取仓库克隆链接
 * @property {function(Task): Promise<string>} getDefaultBranch - 获取默认分支
 * @property {function(Task): Promise<Array<{source: string, target: string, title: string}>>} getMergeRequest - 获取合并请求
 */

/**
 * 检查是否有分支冲突的情况
 * @param {*} context 
 */
async function reset(context) {
  printer.warning('-'.repeat(100));
  let { platform, task } = context;
  if (!config.platforms.includes(platform)) {
    throw new Error('不支持的平台: ' + platform);
  }
  const PlatformHandlerClass = require(`./platform/${platform}`);
  /** @type {PlatformHandler} */
  const platformHandler = new PlatformHandlerClass();
  let defaultBranch = await platformHandler.getDefaultBranch(task);
  if (task.target !== defaultBranch) {
    printer.print('目标分支: ').yellow(task.target).println(' 不是默认分支: ' + defaultBranch);
    return 'end';
  }

  let repo = context.task.repo;
  if (!await _exists(context.workspace)) {
    await _mkdir(context.workspace);
  }
  context.cwd = path.join(context.workspace, `./${repo}`);
  printer.print('CWD: ').yellow(context.cwd).println();

  // 如果仓库目录不存在，则克隆仓库
  if (!await _exists(context.cwd)) {
    let httpsLink = platformHandler.getCloneLink(task);
    await _exec(`git clone ${httpsLink} ${context.cwd}`, context.workspace);
  } else {
    await git.branch.reset(task.target, context.cwd);
  }

  let tmpBranch, cwd = context.cwd;
  let target = task.target.indexOf('refs/heads/') === -1 ? task.target : task.target.replace('refs/heads/', '');
  context.target = target;
  try {
    await git.branch.checkout(target, true, cwd);
    tmpBranch = `tmp/commit-${await git.commit.id(cwd)}`;
  } catch (err) {
    debug.log(err);
    return false;
  }

  await git.branch.reset(target, cwd);
  await git.branch.clear(cwd, false);
  await _shell(`git checkout -b ${tmpBranch}`, cwd, false, false);
  context.items = await platformHandler.getMergeRequest(task);
}

async function readConfig(context) {
  printer.warning('-'.repeat(100));
  const ymlConfigFile = path.join(context.cwd, '.cd.yml');
  if (!await _exists(ymlConfigFile)) {
    printer.warning('没有找到 .cd.yml 文件，请检查文件是否存在');
    context.success = false;
    return 'end';
  }
  const ymlConfig = await _yaml(ymlConfigFile);
  printer.print('读取到配置: ').green(ymlConfig.name || '未命名').println();

  // 这里可以根据配置执行部署逻辑
  context.deployConfig = ymlConfig;
  const items = context.items.filter(i => {
    if (i.source === i.target) {
      return false;
    }
    if (i.source === `${context.target}`) {
      return false;
    }

    // 检查分支是否匹配配置的分支模式
    if (context.deployConfig.on && context.deployConfig.on.branches) {
      const isIncluded = matchesBranchPatterns(i.source, context.deployConfig.on.branches);

      // 检查是否在排除列表中
      if (context.deployConfig.on.exclude_branches) {
        const isExcluded = matchesBranchPatterns(i.source, context.deployConfig.on.exclude_branches);
        return isIncluded && !isExcluded;
      }

      return isIncluded;
    }

    // 如果没有配置分支规则，默认包含所有分支（除了目标分支）
    return true;
  });
  context.items = items;
  if (!items || !items.length) {
    debug.log('error', '没有需要部署的分支');
    return 'end';
  }
}

async function merge(context) {
  printer.warning('-'.repeat(100));
  let curr = '';
  let { items, cwd } = context;
  let last = null;
  try {
    items = items.sort((a, b) => {
      if (a.source === b.source) {
        return 0;
      }
      return a.source > b.source ? 1 : -1;
    });
    printer.yellow('需要合并的分支: ').println();
    items.forEach((item) => {
      printer.yellow(item.source).print(' -> ').green(item.target).println();
    });
    await _foreach(items, async (item) => {
      curr = item;
      let source = item.source.indexOf('refs/heads/') === -1 ? item.source : item.source.replace('refs/heads/', '');
      await _exec(`git merge origin/${source} -m 'merge: ${source}'`, cwd);
      last = curr;
      if (!await git.branch.exist(source, cwd)) {
        throw new Error('分支不存在: ' + source);
      }
    });
    context.success = true;
  } catch (err) {
    if (last === null) {
      last = items[0];
    }
    printer.print('Merge ').yellow(`${items.map(i => i.source).join(' | ')}`).println(' branches failed. last branch: ' + last.source);
    debug.log(err);
    context.success = false;
  }
}

async function execSteps(label, scripts, context) {
  if (!scripts) {
    return true;
  }
  printer.yellow(label + ': ').println();
  try {
    await _foreach(scripts, async (script) => {
      if (is.string(script)) {
        await _exec(script, context.cwd);
      } else if (is.array(script)) {
        await _foreach(script, async (line) => {
          printer.yellow(line.name + ': ').println();
          await _exec(line.run, context.cwd);
        });
      } else if (is.object(script) && script.run) {
        await _exec(script.run, context.cwd);
      } else {
        debug.log({ script });
        printer.print('不支持的脚本类型: ').red(script).println();
        return false;
      }
    });
    return true;
  } catch (err) {
    printer.print('执行 ' + label + ' 脚本失败: ').red(err.message).println();
    return false;
  }
}

async function deploy(context) {
  printer.warning('-'.repeat(100));
  printer.print('开始部署: ').green(context.task.repo).println();
  try {
    // 合并代码后，再读一次 .cd.yml 文件，避免配置文件被修改
    const ymlConfigFile = path.join(context.cwd, '.cd.yml');
    if (!await _exists(ymlConfigFile)) {
      printer.warning('没有找到 .cd.yml 文件，可能已被删除，请检查文件是否存在');
      return;
    }
    context.deployConfig = await _yaml(ymlConfigFile);
    if (!context.deployConfig) {
      printer.warning('读取 .cd.yml 文件失败');
      context.success = false;
      return;
    }
    const deployConfig = context.deployConfig;
    // 加载 env
    const env = deployConfig.env || {};
    Object.keys(env).forEach((key) => {
      process.env[key] = env[key];
    });
    const { pre_deploy, post_deploy, cleanup } = deployConfig.scripts || {};
    const deploy = deployConfig.deploy || [];
    const steps = deploy.steps || [];
    if (!await execSteps('执行预部署脚本', pre_deploy, context)) {
      context.success = false;
      return 'end';
    }
    if (!await execSteps('执行部署脚本', steps, context)) {
      context.success = false;
      return 'end';
    }
    if (!await execSteps('执行后部署脚本', post_deploy, context)) {
      context.success = false;
      return 'end';
    }
    if (!await execSteps('执行清理脚本', cleanup, context)) {
      context.success = false;
      return 'end';
    }
  } catch (error) {
    debug.log(error);
    context.success = false;
    context.error = error;
    return 'end';
  }
}

async function end(context) {
  printer.warning('-'.repeat(100));
  if (context.success) {
    printer.print('Deploy ').green('success').println('!');
  } else {
    printer.print('Deploy ').red('failed').println('!');
  }
}

module.exports = {
  reset,
  readConfig,
  merge,
  deploy,
  end
};
