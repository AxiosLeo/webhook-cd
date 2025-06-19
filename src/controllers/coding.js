'use strict';

const { Controller } = require('@axiosleo/koapp');
const { printer } = require('@axiosleo/cli-tool');

class CodingController extends Controller {
  /**
   * @returns {Promise<import('../../index.d.ts').TaskInfo>}
   */
  async receiveEvent(team, project, body) {
    let source, target, repo;
    if (body.mergeRequest) {
      source = body.mergeRequest.head ? body.mergeRequest.head.ref : '';
      target = body.mergeRequest.base ? body.mergeRequest.base.ref : '';
      repo = body.mergeRequest.base ? body.mergeRequest.base.repo.name : '';
    } else {
      source = body.ref || '';
      target = body.ref || '';
      repo = body.repository ? body.repository.name : '';
    }
    switch (body.event) {
      case 'GIT_MR_CREATED':
      case 'GIT_MR_NOTE':
      case 'GIT_PUSHED':
      case 'GIT_MR_UPDATED':
      case 'GIT_MR_MERGED':
      case 'GIT_MR_CLOSED':
        break;
      default:
        printer.warning('Unknown event: ', body.event);
        return null;
    }
    const task = {
      platform: 'coding',
      team,
      project,
      event: body.event,
      source,
      target,
      repo,
      trigger: 'webhook',
      request: body,
    };
    return task;
  }
}

module.exports = CodingController;
