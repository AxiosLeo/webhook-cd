'use strict';

const { printer } = require('@axiosleo/cli-tool');
const { createClient } = require('@axiosleo/orm-mysql');
const git = require('./git');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');

const _db = () => {
  return createClient({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || 'password',
    port: Number(process.env.MYSQL_PORT || '23306'),
    database: process.env.MYSQL_DB || 'webhook'
  });
};

const gitMerge = async (target, cwd, branchs) => {
  await git.branch.reset(target, cwd);
  await git.branch.clear(cwd, false);
  const last_commit_id = await git.commit.id(cwd);
  const tmpBranch = `tmp/commit-${last_commit_id}`;

  // 创建临时分支
  await _shell(`git checkout -b ${tmpBranch}`, cwd, false, false);

  let curr;
  try {
    await _foreach(branchs, async (branch) => {
      curr = branch;
      printer.warning(`deploy development branch: ${branch}`);
      // debug.log(`git merge origin/${branch} -m 'merge: ${branch}'`);
      await _exec(`git merge origin/${branch} -m 'merge: ${branch}'`, cwd);
    });
    return null;
  } catch (err) {
    return curr;
  }
};

const _merge = async (target, cwd, branchs = []) => {
  branchs = branchs.sort();

  let failedBranches = [];
  let failedBranch;
  do {
    let mergeBranchs = branchs.filter((branch) => !failedBranches.includes(branch));
    failedBranch = await gitMerge(target, cwd, mergeBranchs);
    if (failedBranch !== null) {
      failedBranches.push(failedBranch);
    }
  } while (failedBranch !== null);

  return {
    merged: branchs.filter(b => !failedBranches.includes(b)),
    failed: failedBranches
  };
};

module.exports = {
  _db,
  _merge
};
