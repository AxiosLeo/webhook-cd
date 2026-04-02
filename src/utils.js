'use strict';

const yaml = require('yaml');
const { printer } = require('@axiosleo/cli-tool');
const { createClient, QueryHandler } = require('@axiosleo/orm-mysql');
const git = require('./git');
const { _exec, _shell, _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const config = require('../config');
const { _read, _exists } = require('@axiosleo/cli-tool/src/helper/fs');

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

async function _yaml(file) {
  if (await _exists(file)) {
    const content = await _read(file);
    return yaml.parse(content);
  }
  return null;
}

/**
 * 通配符匹配函数
 * @param {string} pattern - 模式字符串，支持 * 通配符
 * @param {string} str - 要匹配的字符串
 * @returns {boolean} 是否匹配
 */
function _wildcardMatch(pattern, str) {
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
function _matchesBranchPatterns(branchName, patterns) {
  if (!patterns || !Array.isArray(patterns)) {
    return false;
  }

  // 移除 refs/heads/ 前缀（如果存在）
  const cleanBranchName = branchName.replace(/^refs\/heads\//, '');

  return patterns.some(pattern => _wildcardMatch(pattern, cleanBranchName));
}

function _matchesBranch(deployConfig, mergeList) {
  return mergeList.filter((i) => {
    if (deployConfig.on && deployConfig.on.branches) {
      const isIncluded = _matchesBranchPatterns(i.source, deployConfig.on.branches);

      // 检查是否在排除列表中
      if (deployConfig.on.exclude_branches) {
        const isExcluded = _matchesBranchPatterns(i.source, deployConfig.on.exclude_branches);
        return isIncluded && !isExcluded;
      }

      return isIncluded;
    }
    return true;
  });
}

module.exports = {
  _db,
  _yaml,
  _merge,
  _table,
  _matchesBranch
};
