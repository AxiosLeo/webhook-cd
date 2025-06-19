'use strict';

const path = require('path');
const { _write } = require('@axiosleo/cli-tool/src/helper/fs');
const { Controller } = require('@axiosleo/koapp');

class CodingController extends Controller {
  /**
   * @returns {Promise<import('../../index.d.ts').TaskInfo>}
   */
  async receiveEvent(team, project, body) {
    await _write(
      path.join(__dirname, `../../runtime/logs/webhook_${body.event.toLowerCase()}.log`),
      JSON.stringify(body, null, 2)
    );
    let event = '', source = '', target = '', repo = '';
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
        event = 'merge_created';
        break;
      case 'GIT_MR_NOTE':
      case 'GIT_PUSHED':
      case 'GIT_MR_UPDATED':
        event = 'merge_updated';
        break;
      case 'GIT_MR_MERGED':
      case 'GIT_MR_CLOSED':
        event = 'merge_closed';
        break;
      default:
        throw new Error('未知事件: ' + body.event);
    }
    const task = {
      platform: 'github',
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

module.exports = CodingController;
