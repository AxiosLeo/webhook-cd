'use strict';

// eslint-disable-next-line no-unused-vars
const { debug, printer, Workflow } = require('@axiosleo/cli-tool');
const { Hook } = require('@axiosleo/orm-mysql');
const { QueryHandler } = require('@axiosleo/orm-mysql');
const { _db } = require('./utils');
const path = require('path');
const flow = require('./flow');

const open = async (task) => {
  const handle = new QueryHandler(_db());
  task.router = `${task.platform}@${task.project}@${task.repo}@${task.target}@${task.source}`;
  try {
    await handle.upsert('webhook_status', {
      ...task,
      status: 0
    }, {
      router: task.router
    });
  } catch (err) {
    debug.log('error', err);
  }
  return task.router;
};

const close = async (task) => {
  const handle = new QueryHandler(_db());
  task.router = `${task.platform}@${task.project}@${task.repo}@${task.target}@${task.source}`;
  try {
    await handle.upsert('webhook_status', {
      ...task,
      status: 1
    }, {
      router: task.router
    });
  } catch (err) {
    debug.log('error', err);
  }
  return task.router;
};

const runTask = async (task, recur = false) => {
  // const router = `${task.platform}@${task.project}@${task.repo}@${task.target}@${task.source}`;
  try {
    const handle = new QueryHandler(_db());

    const mrs = await handle.table('webhook_status')
      .whereObject({
        platform: task.platform,
        project: task.project,
        repo: task.repo,
        target: task.branch,
        status: 0
      }).orderBy('source').select();

    const context = { task, mrs };
    const workflow = new Workflow(flow);
    await workflow.start(context);
  } catch (err) {
    debug.log(err);
  }
};

const deploy = async () => {
  let workspace = process.env.WEBHOOK_CD_WORKSPACE || path.join(__dirname, '../../');
  if (!path.isAbsolute(workspace)) {
    workspace = path.resolve(__dirname, '../', workspace);
  }
  const envs = Object.keys(process.env).filter((k) => k.indexOf('WEBHOOK_CD_REPO_') === 0);
  envs.forEach((k) => {
    if (k.endsWith('_REPO')) {
      let [platform, team, project, repo, branch] = process.env[k].split(':', 5);
      k = k.substring(0, k.length - 5);
      let dir = envs.includes(k + '_DIR') ? process.env[k + '_DIR'] : './' + repo;
      const task = {
        workspace,
        platform,
        team,
        project,
        repo,
        branch,
        dir
      };
      process.nextTick(runTask, task);
    }
  });
};

Hook.register(close, 'receive-task', 'GIT_MR_MERGED');
Hook.register(close, 'receive-task', 'GIT_MR_CLOSED');
Hook.register(open, 'receive-task', 'GIT_MR_CREATED');
Hook.register(open, 'receive-task', 'GIT_MR_UPDATED');
Hook.register(open, 'receive-task', 'GIT_MR_NOTE');

module.exports = {
  open,
  close,
  deploy
};
