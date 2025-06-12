'use strict';

const path = require('path');
const { debug } = require('@axiosleo/cli-tool');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const git = require('./git');
const { printer } = require('@axiosleo/cli-tool');
const { _exists } = require('@axiosleo/cli-tool/src/helper/fs');
const config = require('../config');

/**
 * 检查是否有分支冲突的情况
 * @param {*} context 
 */
async function reset(context) {
  let { platform, task, items } = context;
  if (platform !== 'coding') {
    throw new Error('暂时只支持 coding 平台. 平台: ' + platform);
  }
  let repo = context.task.repo;
  context.cwd = path.join(context.workspace, `./${repo}`);
  printer.print('CWD: ').yellow(context.cwd).println();
  // 如果仓库目录不存在，则克隆仓库
  if (!await _exists(context.cwd)) {
    let httpsLink = `https://${config.coding.username}:${config.coding.user_token}@e.coding.net/${task.team}/${task.project}/${task.repo}.git`;
    await _exec(`git clone ${httpsLink} ${context.cwd}`, context.workspace);
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

  items = items.filter(i => i.source !== target);
  if (!items || !items.length) {
    debug.log('error', '没有需要部署的分支');
    return 'end';
  }
  context.items = items;
}

async function merge(context) {
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
    await _foreach(items, async (item) => {
      curr = item;
      let source = item.source.indexOf('refs/heads/') === -1 ? item.source : item.source.replace('refs/heads/', '');
      printer.warning(`deploy development branch: ${source}`);
      debug.log(`git merge origin/${source} -m 'merge: ${source}'`);
      await _exec(`git merge origin/${source} -m 'merge: ${source}'`, cwd);
      last = curr;
      if (!await git.branch.exist(source, cwd)) {
        return;
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

async function deploy(context) {
  if (await _exists(path.join(context.cwd, '.cd.sh'))) {
    await _exec('sh .cd.sh', context.cwd);
  }
}

async function end(context) {
  if (context.success) {
    printer.print('Deploy ').green('success').println('!');
  } else {
    printer.print('Deploy ').red('failed').println('!');
  }
}

module.exports = {
  reset,
  merge,
  deploy,
  end
};
