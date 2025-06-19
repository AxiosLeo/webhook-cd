'use strict';

const { Connection } = require('rabbitmq-client');
const config = require('../config');
const { _md5 } = require('@axiosleo/cli-tool/src/helper/str');
const Validator = require('validatorjs');

/**
 * @param {import('..').TaskInfo} task 
 */
async function sendTask(task) {
  let validation = new Validator(task, {
    platform: ['required', 'string', { in: config.platforms }],
    team: ['required', 'string'],
    project: ['required', 'string'],
    repo: ['required', 'string'],
    source: ['required', 'string'],
    target: ['required', 'string'],
    event: ['required', 'string'],
    trigger: ['required', 'string', { in: ['cli', 'webhook'] }]
  });
  validation.check();
  if (validation.fails()) {
    const errors = validation.errors.all();
    const keys = Object.keys(errors);
    throw new Error(`${keys[0]}: ${errors[keys[0]]}`);
  }

  // 生成路由
  task.router = `${task.platform}::${task.team}::${task.project}::${task.repo}::${task.target}`;
  task.uuid = _md5(`${task.platform}@${task.team}@${task.project}@${task.repo}@${task.target}@${task.source}`);

  // 发送 rabbitMQ 消息
  const c = config.rabbit;
  const rabbit = new Connection(`amqp://${c.user}:${c.pass}@${c.host}:${c.port}`);
  const pub = rabbit.createPublisher({
    queues: c.topic,
    // Enable publish confirmations, similar to consumer acknowledgements
    confirm: true,
    // Enable retries
    maxAttempts: 2,
    // Optionally ensure the existence of an exchange before we use it
    exchanges: [{ exchange: c.exchange, type: 'topic' }]
  });

  await pub.send(
    { exchange: c.exchange, routingKey: 'webhook.' + task.platform },
    { router: task.router, event: task.event, platform: task.platform, task }
  );

  await pub.close();
  await rabbit.close();
}

module.exports = {
  sendTask
};
