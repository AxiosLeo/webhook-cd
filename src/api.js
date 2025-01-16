'use strict';

const { Router, error, success } = require('@axiosleo/koapp');
const { debug } = require('@axiosleo/cli-tool');
const { _write } = require('@axiosleo/cli-tool/src/helper/fs');
const path = require('path');
const { sendTask } = require('./task');

const auth = async (context) => {
  const ctx = context.koa;
  const userAgent = ctx.request.header['user-agent'];
  if (userAgent !== 'Coding.net Hook') {
    error(403, 'Unauthorized');
  }
};

const root = new Router('');

root.new('/***', {
  method: 'any',
  handlers: [async (context) => {
    debug.log(context.body, context.router);
    success({ router: context.router });
  }]
});

// https://lark-apps.leadmapcloud.com/webhook/coding/<team>/<project>
// https://lark-apps.leadmapcloud.com/webhook/coding/g-jyts9813/lark-apps
// https://e.coding.net/open-api/?action=DescribeEvents
root.add(new Router('/coding/{:team}/{:project}', {
  method: 'post',
  middlewares: [auth],
  handlers: [async (context) => {
    const { team, project } = context.params;
    const body = context.body;
    await _write(path.join(__dirname, `../runtime/logs/webhook_${body.event.toLowerCase()}.log`), JSON.stringify(body, null, 2));
    let event = '';
    switch (body.event) {
      case 'GIT_MR_CREATED':
        event = 'merge_created';
        break;
      case 'GIT_MR_NOTE':
      case 'GIT_MR_UPDATED':
        event = 'merge_updated';
        break;
      case 'GIT_MR_MERGED':
      case 'GIT_MR_CLOSED':
        event = 'merge_closed';
        break;
      default:
        success({ message: '未知事件: ' + body.event });
    }
    const mergeRequest = body.mergeRequest || {};
    const task = {
      platform: 'coding',
      team,
      project,
      event,
      source: mergeRequest.head ? mergeRequest.head.ref : '',
      target: mergeRequest.base ? mergeRequest.base.ref : '',
      repo: mergeRequest.base ? mergeRequest.base.repo.name : '',
      merge_request: mergeRequest,
      trigger: 'webhook',
      request: body
    };
    debug.log(task);
    await sendTask(task);
    success({ event });
  }]
}));

module.exports = root;
