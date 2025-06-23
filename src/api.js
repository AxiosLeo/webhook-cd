'use strict';

const { Router, error, success } = require('@axiosleo/koapp');
const { sendTask } = require('./task');
const CodingController = require('./controllers/coding');
const GithubController = require('./controllers/github');
const config = require('../config');

const root = new Router();

root.new('/***', {
  method: 'any',
  handlers: [async () => {
    error(404, 'Not Found');
  }]
});

root.new('/coding/{:team}/{:project}', {
  method: 'post',
  handlers: [
    /**
     * @param {import('@axiosleo/koapp').KoaContext} context
     */
    async (context) => {
      const { team, project } = context.params;
      const body = context.body;

      let task = null;
      const controller = new CodingController();
      task = await controller.receiveEvent(team, project, body);
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
    }
  ]
});

root.new('/github/{:team}/{:project}', {
  method: 'post',

  handlers: [
    /**
     * @param {import('@axiosleo/koapp').KoaContext} context
     */
    async (context) => {
      const controller = new GithubController();
      if (config.github.webhook_secret) {
        const signature = context.headers['x-hub-signature-256'];
        if (!signature) {
          error(403, 'Unauthorized');
        }

        // 获取原始请求体内容
        const rawBody = context.koa.request.rawBody || context.koa.req.rawBody || '';

        const isValid = await controller.verifySignature(config.github.webhook_secret, signature, rawBody);
        if (!isValid) {
          error(403, 'Unauthorized');
        }
      }
      const { team, project } = context.params;
      const body = context.body;
      let task = null;

      task = await controller.receiveEvent(team, project, JSON.parse(body.payload));
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
    }
  ]
});

module.exports = root;
