'use strict';

const { _sleep } = require('@axiosleo/cli-tool/src/helper/cmd');
const { debug } = require('@axiosleo/cli-tool');
const axios = require('axios');
const config = require('../../config');

/**
 * https://coding.net/help/openapi#/operations/DescribeIssueList
 */
class CodingSDK {
  constructor(options = {}) {
    this.options = options;
    this.bashUrl = 'https://e.coding.net/open-api/';
    this.token = config.coding.user_token || null;
  }

  async request(action, data = {}, options = {}) {
    const requestConfig = {
      method: 'POST',
      url: this.bashUrl,
      ...options
    };
    Object.assign(data, {
      Action: action,
      Authorization: this.token
    });
    requestConfig.data = data;

    const response = await axios(requestConfig);
    let result = response.data;
    if (result.Response.Error && result.Response.Error.Code === 'RequestLimitExceeded') {
      debug.dump('请求次数超过限制，等待30秒后重试');
      await _sleep(30000);
      return this.request(action, data, options);
    }
    return response.data;
  }

  async getMembers() {
    const res = await this.request('DescribeTeamMembers', {
      'PageNumber': 1,
      'PageSize': 100,
      'ShowDepartment': true,
    });
    return res.Response.Data.TeamMembers;
  }

  /**
   * 
   * @returns {Array}
   */
  async getProjects() {
    const res = await this.request('DescribeCodingProjects', {
      'PageNumber': '1',
      'PageSize': '200',
    });
    return res.Response.Data.ProjectList;
  }

  /**
   * 
   * @param {*} projectName 
   * @param {*} offset 
   * @param {*} limit 
   * @returns {Array}
   */
  async getTasks(projectName, offset = 0, limit = 100) {
    const data = {
      'ProjectName': projectName,
      'Offset': offset,
      'Limit': limit,
      'SortKey': 'CODE',
      'SortValue': 'DESC',
      'IssueType': 'ALL',
    };
    const res = await this.request('DescribeIssueList', data);
    if (!res.Response.IssueList) {
      // debug.log(res.Response.Error, data);
      return [];
    }
    return res.Response.IssueList;
  }

  async getIterations(projectName, offset = 0, limit = 100) {
    let res = await this.request('DescribeIterationList', {
      ProjectName: projectName,
      Offset: offset,
      Limit: limit,
    });
    if (!res.Response.Data) {
      return [];
    }
    return res.Response.Data.List;
  }

  /**
   * https://coding.net/help/openapi#/operations/DescribeProjectDepotInfoList
   * @param {*} projectId 
   * @param {*} pageNumber 
   * @param {*} pageSize 
   * @returns 
   */
  async getRepos(projectId, pageNumber = 0, pageSize = 100) {
    const req = {
      'ProjectId': parseInt(projectId),
      'PageNumber': `${pageNumber}`,
      'PageSize': `${pageSize}`,
    };
    const res = await this.request('DescribeProjectDepotInfoList', req);
    if (res.Response.Error) {
      debug.halt(res, { projectId, req });
      return [];
    }
    return res.Response.DepotData.Depots;
  }

  /**
   * https://coding.net/help/openapi#/operations/DescribeGitBranches
   * @param {*} depotId 
   * @param {*} pageNumber 
   * @param {*} pageSize 
   * @returns 
   */
  async getRepoBranches(depotId, pageNumber = 0, pageSize = 10000) {
    const res = await this.request('DescribeGitBranches', {
      'DepotId': depotId,
      'PageNumber': pageNumber,
      'PageSize': pageSize,
    });
    return res.Response.Branches;
  }
}

module.exports = CodingSDK;
