'use strict';

const { Command } = require('@axiosleo/cli-tool');
const { sendTask } = require('../src/task');
const { _db } = require('../src/utils');

/**
 * wcd pop g-jyts9813 lark-apps lark-apps --platform coding --source feat/sync-lark --target master
 */
class PopCommand extends Command {
  constructor() {
    super({
      name: 'pop',
      desc: ''
    });
    this.addArgument('team', 'Team name', 'required', null);
    this.addArgument('project', 'Project name', 'required', null);
    this.addArgument('repo', 'Repo name', 'required', null);

    this.addOption('platform', null, 'Platform name', 'optional', 'coding');
    this.addOption('source', 's', 'Source branch', 'optional', 'master');
    this.addOption('target', 't', 'Target branch', 'optional', 'develop');
  }
  async exec(args, options) {
    const task = {
      platform: options.platform,
      team: args.team,
      project: args.project,
      repo: args.repo,
      event: 'merge_closed',
      source: options.source,
      target: options.target,
      trigger: 'cli'
    };
    await sendTask(task);
    _db().end();
  }
}

module.exports = PopCommand;
