'use strict';

const { Command } = require('@axiosleo/cli-tool');
const { close } = require('../src/task');
const { _db } = require('../src/utils');

class PopCommand extends Command {
  constructor() {
    super({
      name: 'pop',
      desc: ''
    });
    this.addArgument('project', 'Project name', 'required', null);
    this.addArgument('repo', 'Repo name', 'required', null);

    this.addOption('platform', null, 'Platform name', 'optional', 'coding');
    this.addOption('source', 's', 'Source branch', 'optional', 'master');
    this.addOption('target', 't', 'Target branch', 'optional', 'master');
  }
  async exec(args, options) {
    const task = {
      platform: options.platform,
      project: args.project,
      coding_event: 'merge_request',
      event: 'GIT_MR_CREATED',
      source: options.source,
      target: options.target,
      repo: args.repo,
    };
    await close(task);
    _db().end();
  }
}

module.exports = PopCommand;
