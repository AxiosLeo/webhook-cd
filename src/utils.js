'use strict';

const { printer } = require('@axiosleo/cli-tool');
const { createClient, QueryHandler } = require('@axiosleo/orm-mysql');
const git = require('./git');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const config = require('../config');

const _db = () => {
  return createClient(config.mysql);
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

/**
 * @param {string} table_name 
 * @returns {import('@axiosleo/orm-mysql').QueryOperator}
 */
function _table(table_name) {
  const conn = _db();
  const handle = new QueryHandler(conn);
  return handle.table(table_name);
}

module.exports = {
  _db,
  _merge,
  _table
};
