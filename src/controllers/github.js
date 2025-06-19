'use strict';

const { printer } = require('@axiosleo/cli-tool');
const is = require('@axiosleo/cli-tool/src/helper/is.js');
const { Controller } = require('@axiosleo/koapp');

class GithubController extends Controller {
  /**
   * @param {import('@axiosleo/koapp').KoaContext} context
   * @returns {Promise<import('../../index.d.ts').TaskInfo>}
   */
  async receiveEvent(team, project, body) {
    if (is.empty(body.pull_request)) {
      return null;
    }
    let source, target, repo;
    switch (body.action) {
      case 'opened':
      case 'synchronize':
      case 'closed':
        break;
      default:
        printer.warning('Unknown action: ', body.action);
        return null;
    }
    source = body.pull_request.head.ref;
    target = body.pull_request.base.ref;
    repo = body.repository.name;
    const task = {
      platform: 'github',
      team,
      project,
      event: body.action,
      source,
      target,
      repo,
      trigger: 'webhook',
      request: body,
    };
    return task;
  }
}

module.exports = GithubController;
