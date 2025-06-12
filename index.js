'use strict';

const { KoaApplication } = require('@axiosleo/koapp');
const { printer } = require('@axiosleo/cli-tool');
const { consumer, onShutdown } = require('./src/mq');
const router = require('./src/api');

const startWebApp = async (options) => {
  const app = new KoaApplication({
    port: options.port || 8800,
    listen_host: options.listen_host || '0.0.0.0',
    routers: [router]
  });
  app.start();
};

if (require.main === module) {
  process.nextTick(startWebApp, {
    port: process.env.LISTEN_PORT ? parseInt(process.env.LISTEN_PORT) : 8800,
    listen_host: process.env.LISTEN_HOST || '0.0.0.0',
  });
  process.nextTick(consumer);
}

process.on('SIGINT', async () => {
  await onShutdown();
  printer.println().green('RabbitMQ Exited').println();

  process.exit(0);
});

module.exports = {
  startWebApp,
};
