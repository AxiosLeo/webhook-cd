'use strict';

const { Router, error, success } = require('@axiosleo/koapp');
const { debug } = require('@axiosleo/cli-tool');
const { sendTask } = require('./task');
const CodingController = require('./controllers/coding');
const GithubController = require('./controllers/github');

const auth = async (context) => {
  // const ctx = context.koa;
  // const userAgent = ctx.request.header['user-agent'];
  // if (userAgent !== 'Coding.net Hook') {
  //   error(403, 'Unauthorized');
  // }
};

const root = new Router('', {
  middlewares: [auth]
});

root.new('/***', {
  method: 'any',
  handlers: [async (context) => {
    debug.log(context.body, context.router);
    success({ router: context.router });
  }]
});

root.post('/{:platform}/{:team}/{:project}', async (context) => {
  const { platform, team, project } = context.params;
  const body = context.body;
  let task = null;
  if (platform === 'github') {
    const controller = new GithubController();
    task = await controller.receiveEvent(team, project, JSON.parse(body.payload));
  } else if (platform === 'coding') {
    const controller = new CodingController();
    task = await controller.receiveEvent(team, project, body);
  } else {
    error(400, 'Unknown platform');
  }
  if (!task) {
    success({ event: 'unknown' });
  }
  await sendTask(task);
  success({ event: task.event });
}, {
  params: {
    rules: {
      team: 'required|string',
      project: 'required|string',
    }
  }
});

module.exports = root;
