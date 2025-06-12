'use strict';

const config = require('../config');
const { Connection } = require('rabbitmq-client');
const { debug } = require('@axiosleo/cli-tool');
const { _table } = require('./utils');
const { Workflow } = require('@axiosleo/cli-tool');
const flow = require('./flow');
const { printer } = require('@axiosleo/cli-tool');

let rabbit = null;
let sub = null;

/**
 * 监听 RabbitMQ 队列
 */
const consumer = async () => {
  const c = config.rabbit;
  rabbit = new Connection(`amqp://${c.user}:${c.pass}@${c.host}:${c.port}`);

  rabbit.on('error', (err) => {
    printer.warning('RabbitMQ connection error', err);
  });
  rabbit.on('connection', () => {
    printer.warning('RabbiMQ connection successfully');
  });

  sub = rabbit.createConsumer({
    queue: c.topic,
    queueOptions: { durable: true },
    // handle 2 messages at a time
    qos: { prefetchCount: 2 },
    // Optionally ensure an exchange exists
    exchanges: [{ exchange: c.exchange, type: 'topic' }],
    // With a "topic" exchange, messages matching this pattern are routed to the queue
    queueBindings: [{ exchange: c.exchange, routingKey: 'webhook.*' }],
  }, async (msg) => {
    debug.log('received message (user-events)', msg);
    try {
      const { router, event, task, platform } = msg.body;
      let status = '';
      switch (event) {
        case 'merge_created':
        case 'merge_updated':
          status = 'wait';
          break;
        case 'merge_closed':
          status = 'closed';
          break;
        default:
          throw new Error('未知事件: ' + event);
      }

      // // 在日志表中插入记录
      await _table('task_logs').insert({
        router: task.router,
        event: task.event,
        trigger: task.trigger,
        request: task.request || {}
      });

      // // 在当前分支管理表中插入记录
      await _table('merge_list').keys('uuid', task.uuid).insert({
        uuid: task.uuid,
        router: task.router,
        platform: task.platform,
        team: task.team,
        project: task.project,
        source: task.source,
        target: task.target,
        repo: task.repo,
        status: status, // 0: 未完成, 10: 进行中, 20: 已完成
      });
      const items = await _table('merge_list')
        .where('router', router)
        .where('status', 'wait')
        .select();
      const context = { platform, task, items, workspace: config.workspace };
      const workflow = new Workflow(flow);
      await workflow.start(context);
    } catch (err) {
      debug.dump(err);
    }
  });
  sub.on('error', (err) => {
    // Maybe the consumer was cancelled, or the connection was reset before a
    // message could be acknowledged.
    debug.log('consumer error (user-events)', err);
  });
};

const onShutdown = async () => {
  await sub.close();
  await rabbit.close();
};

module.exports = { consumer, onShutdown };
