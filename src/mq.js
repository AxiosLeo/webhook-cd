'use strict';

const config = require('../config');
const { Connection } = require('rabbitmq-client');
const { debug } = require('@axiosleo/cli-tool');
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
    try {
      const { task, platform } = msg.body;
      let status = '';
      const context = { platform, task, workspace: config.workspace, status };
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
