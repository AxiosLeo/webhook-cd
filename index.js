'use strict';

const dotenv = require('dotenv');
dotenv.config();

const { KoaApplication, Router, error, success } = require('@axiosleo/koapp');
const { Hook } = require('@axiosleo/orm-mysql');
const { deploy } = require('./src/task');

const auth = async (context) => {
  const ctx = context.koa;
  const userAgent = ctx.request.header['user-agent'];
  if (userAgent !== 'Coding.net Hook') {
    error(403, 'Unauthorized');
  }
};

const startWebApp = async (options) => {
  const app = new KoaApplication({
    port: options.port || 8800,
    listen_host: options.listen_host || '0.0.0.0',
    routers: [new Router('/{:platform}/{:project}', {
      method: 'post',
      middlewares: [auth],
      handlers: [async (context) => {
        const { platform, project } = context.params;
        let coding_event = context.headers['x-coding-event'];
        coding_event = coding_event.split(' ').join('_');

        const body = context.body;
        const mergeRequest = body.mergeRequest;

        const task = {
          platform,
          project,
          coding_event,
          event: body.event.toLowerCase(),
          source: mergeRequest.head.ref,
          target: mergeRequest.base.ref,
          repo: mergeRequest.base.repo.name,
          merge_request: mergeRequest,
          request: body
        };
        task.router = `${platform}@${project}@${task.repo}@${task.target}`;
        Hook.trigger(['receive-task', task.event], task);
        success(task);
      }]
    })]
  });
  app.start();
};

if (require.main === module) {
  process.nextTick(startWebApp, {
    port: 8800,
    listen_host: '0.0.0.0',
  });
  process.nextTick(deploy);
}

module.exports = {
  startWebApp,
};
