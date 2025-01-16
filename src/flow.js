'use strict';

const path = require('path');
const { debug } = require('@axiosleo/cli-tool');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const git = require('./git');
const { printer } = require('@axiosleo/cli-tool');
const { _exists } = require('@axiosleo/cli-tool/src/helper/fs');

/**
 * 检查是否有分支冲突的情况
 * @param {*} context 
 */
async function checkConflict(context) {
  let { platform, task, items } = context;
  if (platform !== 'coding') {
    throw new Error('暂时只支持 coding 平台. 平台: ' + platform);
  }
  let repo = context.task.repo;
  context.cwd = path.join(context.workspace, `./${repo}`);
  let tmpBranch, last = task.target, cwd = context.cwd;

  try {
    await git.branch.checkout(task.target, true, cwd);
    tmpBranch = `tmp/commit-${await git.commit.id(cwd)}`;
  } catch (err) {
    debug.log(err);
    return false;
  }

  await git.branch.reset(last, cwd);
  await git.branch.clear(cwd, false);
  await _shell(`git checkout -b ${tmpBranch}`, cwd, false, false);

  let curr = '';
  items = items.filter(i => i.source !== task.target);
  if (!items || !items.length) {
    debug.log('error', '没有需要部署的分支');
    return false;
  }

  try {
    items = items.sort((a, b) => {
      if (a.source === b.source) {
        return 0;
      }
      return a.source > b.source ? 1 : -1;
    });
    await _foreach(items, async (item) => {
      curr = item;
      printer.warning(`deploy development branch: ${item.source}`);
      debug.log(`git merge origin/${item.source} -m 'merge: ${item.source}'`);
      await _exec(`git merge origin/${item.source} -m 'merge: ${item.source}'`, cwd);
      last = curr;
      if (!await git.branch.exist(item.source, cwd)) {
        return;
      }
    });
    if (await _exists(path.join(cwd, '.deploy.sh'))) {
      await _exec('sh .cd.sh', cwd);
    }
  } catch (err) {
    printer.print('Merge ').yellow(`${items.map(i => i.source).join(' | ')}`).println(' branches failed');
    debug.log(err);
    return false;
  }
}

async function mergeBranches(context) {
  // const { task, branch } = context;
  // const projectDir = path.join(task.workspace, task.dir);
  // if (!await _exists(projectDir)) {
  //   throw new Error('项目目录不存在: ' + projectDir);
  // }

  // await _merge(task.target, projectDir, branch.merged);
}

module.exports = {
  checkConflict,
  mergeBranches
};
