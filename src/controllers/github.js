'use strict';

const { Controller } = require('@axiosleo/koapp');

class GithubController extends Controller {
  /**
   * @param {import('@axiosleo/koapp').KoaContext} context
   * @returns {Promise<import('../../index.d.ts').TaskInfo>}
   */
  async receiveEvent(team, project, body) {
    if (!body.pull_request) {
      return null;
    }
    let event, source, target, repo;
    event = body.action === 'opened' ? 'merge_created' : 'merge_updated';
    switch (body.action) {
      case 'opened':
        event = 'merge_created';
        break;
      case 'synchronize':
        event = 'merge_updated';
        break;
      case 'closed':
        event = 'merge_closed';
        break;
      default:
        return null;
    }
    if (!event) {
      return null;
    }
    source = body.pull_request.head.ref;
    target = body.pull_request.base.ref;
    repo = body.repository.name;
    const task = {
      platform: 'coding',
      team,
      project,
      event,
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
