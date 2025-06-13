'use strict';

const config = require('../../config');
const CodingSDK = require('../sdk/coding');

class CodingPlatform {
  constructor() {
    this.coding = new CodingSDK();
  }
  getCloneLink(task) {
    const { team, project, repo } = task;
    return `https://${config.coding.username}:${config.coding.user_token}@e.coding.net/${team}/${project}/${repo}.git`;
  }

  async getDefaultBranch(task) {
    let res = await this.coding.request('DescribeDepotDefaultBranch', {
      DepotPath: `${task.team}/${task.project}/${task.repo}`
    });
    return res.Response.BranchName;
  }
}

module.exports = CodingPlatform;
