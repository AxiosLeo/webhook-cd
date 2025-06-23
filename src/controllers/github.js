'use strict';

const { printer } = require('@axiosleo/cli-tool');
const is = require('@axiosleo/cli-tool/src/helper/is.js');
const { Controller } = require('@axiosleo/koapp');

let encoder = new TextEncoder();

function hexToBytes(hex) {
  let len = hex.length / 2;
  let bytes = new Uint8Array(len);

  let index = 0;
  for (let i = 0; i < hex.length; i += 2) {
    let c = hex.slice(i, i + 2);
    let b = parseInt(c, 16);
    bytes[index] = b;
    index += 1;
  }

  return bytes;
}

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

  async verifySignature(secret, header, payload) {
    let parts = header.split('=');
    let sigHex = parts[1];

    let algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      algorithm,
      extractable,
      ['sign', 'verify'],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
      algorithm.name,
      key,
      sigBytes,
      dataBytes,
    );

    return equal;
  }
}

module.exports = GithubController;
