'use strict';

const { printer } = require('@axiosleo/cli-tool');
const { consumer, onShutdown } = require('../src/mq');

if (require.main === module) {
  process.nextTick(consumer);
}

process.on('SIGINT', async () => {
  await onShutdown();
  printer.println().green('RabbitMQ Exited').println();

  process.exit(0);
});
