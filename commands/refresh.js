'use strict';

// eslint-disable-next-line no-unused-vars
const { Command, printer, debug } = require('@axiosleo/cli-tool');
const { open } = require('../src/task');
const CodingSDK = require('../src/coding');
const { _foreach } = require('@axiosleo/cli-tool/src/helper/cmd');
const { _db } = require('../src/utils');
const { QueryHandler } = require('@axiosleo/orm-mysql');

class PopCommand extends Command {
  constructor() {
    super({
      name: 'refresh',
      desc: ''
    });
  }

  async exec() {
    const coding = new CodingSDK();
    // debug.halt(coding.user_token);
    let res = await coding.getProjectList('factorybi');
    const [project] = res.data.Response.Data.ProjectList;
    const projectId = project.Id;

    res = await coding.getRepoList(projectId);
    const repoList = [
      'test-cd'
      // 'factorybi-services',
      // 'factorybi-admin',
      // 'factorybi-react',
      // 'factorybi-mobile'
    ];
    let repos = res.data.Response.DepotData.Depots.filter((repo) => {
      if (repoList.includes(repo.Name)) {
        return true;
      }
      return false;
    });

    let rows = [];
    let routers = [];

    const db = _db();
    const handle = new QueryHandler(db);
    await handle.table('webhook_status').where('platform', 'coding').update({ status: 1 });
    await _foreach(repos, async (repo) => {
      const depotId = repo.Id;
      res = await coding.getMergeRequestList(depotId);
      const mrs = res.data.Response.Data.List.filter((mr) => mr.DesBranch === 'master');
      rows.push({ repo, mrs });

      await _foreach(mrs, async (mr) => {
        const task = {
          platform: 'coding',
          project: repo.ProjectName,
          coding_event: 'merge_request',
          event: 'GIT_MR_UPDATED',
          source: mr.SourceBranch,
          target: mr.TargetBranch,
          repo: repo.Name,
        };
        const router = await open(task);
        routers.push(router);
      });
    });
    _db().end();

    printer.success('refresh success');
  }
}

module.exports = PopCommand;
