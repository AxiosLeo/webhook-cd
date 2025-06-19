'use strict';

const { Octokit } = require('octokit');
const config = require('../../config');

class GithubPlatform {
  constructor() {
    this.github = new Octokit({
      auth: config.github.user_token,
    });
  }

  getCloneLink(task) {
    const { team, repo } = task;
    return `https://${config.github.username}:${config.github.user_token}@github.com/${team}/${repo}.git`;
  }

  async getDefaultBranch(task) {
    const { request } = task;
    const { default_branch } = request.repository;
    return default_branch;
  }

  async getMergeRequest(task) {
    let res = await this.github.request('GET /repos/{owner}/{repo}/pulls', {
      owner: task.team,
      repo: task.repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const items = res.data;
    return items.map((item) => {
      return {
        source: item.head.ref,
        target: item.base.ref,
        title: item.title,
      };
    });
  }
}

module.exports = GithubPlatform;
