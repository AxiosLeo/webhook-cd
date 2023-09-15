/* eslint-disable no-unused-vars */
'use strict';

const path = require('path');
const { debug } = require('@axiosleo/cli-tool');
const { _mkdir, _remove, _exists } = require('@axiosleo/cli-tool/src/helper/fs');
const { _exec } = require('@axiosleo/cli-tool/src/helper/cmd');
const { v4: uuidv4 } = require('uuid');
const { _merge } = require('./utils');

/**
 * 检查是否有分支冲突的情况
 * @param {*} context 
 */
async function checkConflict(context) {
  const { task, mrs } = context;
  if (task.platform !== 'coding') {
    throw new Error('暂时只支持 coding 平台');
  }
  // const runtimeDir = path.join(__dirname, '../runtime/repos/', `./${uuidv4()}`);
  const runtimeDir = path.join(__dirname, '../runtime/repos/test');
  await _remove(runtimeDir);
  await _mkdir(runtimeDir);

  const link = `git@e.coding.net:keymantech/${task.project}/${task.repo}.git`;

  await _exec(`git clone ${link}`, runtimeDir);

  const branches = mrs.filter((mr) => mr.target === task.branch)
    .map((mr) => mr.source);

  // 过滤出可以部署成功的分支以及会部署失败的分支
  const { merged, failed } = await _merge(task.target, path.join(runtimeDir, task.repo), branches);

  context.branch = { merged, failed };

}

async function mergeBranches(context) {
  const { task, branch } = context;
  const projectDir = path.join(task.workspace, task.dir);
  if (!await _exists(projectDir)) {
    throw new Error('项目目录不存在: ' + projectDir);
  }

  await _merge(task.target, projectDir, branch.merged);

  debug.halt(context);
}

module.exports = {
  checkConflict,
  mergeBranches
};
