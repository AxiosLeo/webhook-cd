'use strict';

const axios = require('axios');

class CodingSDK {
  constructor(options = {}) {
    this.team = options.team || 'keymantech';
    this.user_token = options.user_token || process.env.CODING_USER_TOKEN;
    // this.client_id = options.client_id || process.env.CODING_CLIENT_ID;
    // this.client_secret = options.client_secret || process.env.CODING_CLIENT_SECRET;
    this.base_uri = `https://${this.team}.coding.net`;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `token ${this.user_token}`
    };
    this.projectId = 10069599;
  }

  async getUserList() {
    return await axios.default.post('https://e.coding.net/open-api', {
      'Action': 'DescribeTeamMembers',
      'PageNumber': 1,
      'PageSize': 20
    }, {
      headers: this.headers
    });
  }

  // eslint-disable-next-line no-undefined
  async getProjectList(name = undefined) {
    return await axios.default.post('https://e.coding.net/open-api', {
      'Action': 'DescribeCodingProjects',
      'PageNumber': 1,
      'PageSize': 20,
      'ProjectName': name
    }, {
      headers: this.headers
    });
  }

  async getProjectById(projectId = 10069599) {
    // default is FactoryBI
    return await axios.default.post('https://e.coding.net/open-api', {
      Action: 'DescribeOneProject',
      ProjectId: projectId
    }, {
      headers: this.headers
    });
  }

  async getRepoList(projectId = 10069599) {
    return await axios.default.post('https://e.coding.net/open-api', {
      Action: 'DescribeProjectDepotInfoList',
      ProjectId: projectId
    }, {
      headers: this.headers
    });
  }

  async getMergeRequestList(depotId = 9431843, status = 'open') {
    // default is factorybi-services
    return await axios.default.post('https://e.coding.net/open-api', {
      Action: 'DescribeDepotMergeRequests',
      DepotId: depotId,
      Status: status,
      PageSize: 100
    }, {
      headers: this.headers
    });
  }
}

module.exports = CodingSDK;
