'use strict';

const is = require('@axiosleo/cli-tool/src/helper/is');
const { _matchesBranch, _yaml } = require('./utils');
const { _foreach, _shell, _exec } = require('@axiosleo/cli-tool/src/helper/cmd');
const git = require('./git.js');
const { debug } = require('@axiosleo/cli-tool');
const { printer } = require('@axiosleo/cli-tool');
const { _exists } = require('@axiosleo/cli-tool/src/helper/fs.js');
const path = require('path');

async function execSteps(label, scripts, cwd) {
  if (!scripts) {
    return true;
  }
  printer.yellow(label + ': ').println();
  try {
    await _foreach(scripts, async (script) => {
      if (is.string(script)) {
        await _exec(script, cwd);
      } else if (is.array(script)) {
        await _foreach(script, async (line) => {
          printer.yellow(line.name + ': ').println();
          await _exec(line.run, line.dir ? path.join(cwd, line.dir) : cwd);
        });
      } else if (is.object(script) && !is.empty(script.run)) {
        if (is.array(script.run)) {
          await _foreach(script.run, async (line) => {
            await _exec(line, script.dir ? path.join(cwd, script.dir) : cwd);
          });
        } else {
          await _exec(script.run, script.dir ? path.join(cwd, script.dir) : cwd);
        }
      } else {
        debug.log({ script });
        printer.print('不支持的脚本类型: ').red(script).println();
        return false;
      }
    });
    return true;
  } catch (err) {
    printer.print('执行 ' + label + ' 脚本失败: ').red(err.message).println();
    return false;
  }
}

class Deployment {
  /**
   * @param {import("../index.d.ts").PlatformHandler} platformHandler 
   */
  constructor(platformHandler, options) {
    this.platformHandler = platformHandler;
    this.workspace = options.workspace;
    this.cwd = options.cwd;
    this.target = options.target;
    this.repo = options.repo;
    this.platform = options.platform;
    this.task = options.task;
    this.status = options.status;
    /** @type {import("../index.d.ts").DeployConfig} */
    this.deployConfig = options.deployConfig;

    /** @type {import("../index.d.ts").DeployJob} */
    this.jobs = [];
  }

  async resolveJobs() {
    const mergeList = (await this.platformHandler.getMergeRequest(this.task) || []).mergeList.filter((i) =>
      !(i.source === i.target || i.source === `${this.target}`)
    );
    if (!mergeList || !mergeList.length) {
      throw new Error('没有需要部署的分支');
    }
    if (this.deployConfig && is.array(this.deployConfig.jobs)) {
      // 多个分支配置
      const jobs = this.deployConfig.jobs;
      jobs.forEach((job) => {
        const items = _matchesBranch(job, mergeList);
        if (!items || !items.length) {
          return;
        }
        this.jobs.push({
          target: job.target,
          items,
          deployConfig: {
            env: this.deployConfig.env,
            ...job
          }
        });
      });
    } else {
      const items = _matchesBranch(this.deployConfig, mergeList);
      if (items && items.length) {
        this.jobs.push({
          target: this.task.target,
          items,
          deployConfig: this.deployConfig
        });
      }
    }
    return this.jobs;
  }

  async execJobs(jobs = []) {
    if (jobs && jobs.length) {
      this.jobs = jobs;
    }
    if (!this.jobs || !this.jobs.length) {
      throw new Error('没有需要部署的任务');
    }
    // 检查多个 jobs 的 target 是否相同
    if (this.jobs.length > 1) {
      const targets = this.jobs.map(job => job.target);
      if (targets.length !== new Set(targets).size) {
        throw new Error('多个 jobs 的 target 不能相同');
      }
    }
    await _foreach(jobs, async (job) => {
      try {
        // 基于 target 分支创建临时分支
        let { target, items, deployConfig } = job;
        if (!target) {
          target = this.task.target.indexOf('refs/heads/') === -1 ? this.task.target : this.task.target.replace('refs/heads/', '');
        }
        let tmpBranch;
        try {
          await git.branch.checkout(target, true, this.cwd);
          tmpBranch = `tmp/commit-${await git.commit.id(this.cwd)}`;
        } catch (err) {
          debug.log(err);
          return false;
        }
        await git.branch.reset(target, this.cwd);
        await git.branch.clear(this.cwd, false);
        await _shell(`git checkout -b ${tmpBranch}`, this.cwd, false, false);

        // 合并代码
        items = items.sort((a, b) => {
          if (a.source === b.source) {
            return 0;
          }
          return a.source > b.source ? 1 : -1;
        });
        printer.yellow('需要合并的分支: ').println();
        items.forEach((item) => {
          printer.yellow(item.source).print(' -> ').green(item.target).println();
        });
        let curr = '', last = null;
        await _foreach(items, async (item) => {
          curr = item;
          let source = item.source.indexOf('refs/heads/') === -1 ? item.source : item.source.replace('refs/heads/', '');
          await _exec(`git merge origin/${source} -m 'merge: ${source}'`, this.cwd);
          last = curr;
          if (!await git.branch.exist(source, this.cwd)) {
            printer.yellow('分支不存在: ').red(source).println();
            printer.print('Merge ').yellow(`${items.map(i => i.source).join(' | ')}`).println(' branches failed. last branch: ' + last.source);
            return false;
          }
        });

        // 合并代码后，再读一次 .cd.yml 文件，避免配置文件被修改
        const ymlConfigFile = path.join(this.cwd, '.cd.yml');
        if (!await _exists(ymlConfigFile)) {
          printer.warning('没有找到 .cd.yml 文件，可能已被删除，请检查文件是否存在');
          return false;
        }
        deployConfig = await _yaml(ymlConfigFile);
        if (!deployConfig) {
          printer.warning('读取 .cd.yml 文件失败');
          return false;
        }
        // 合并配置
        deployConfig = {
          env: {
            ...this.deployConfig.env,
            ...deployConfig.env
          },
          ...this.deployConfig,
          ...deployConfig
        };
        const env = deployConfig.env || {};
        Object.keys(env).forEach((key) => {
          process.env[key] = env[key];
        });

        const { pre_deploy, post_deploy, cleanup } = deployConfig.scripts || {};
        const deploy = deployConfig.deploy || [];
        const steps = deploy.steps || [];

        // 执行部署操作
        if (!await execSteps('执行预部署脚本', pre_deploy, this.cwd)) {
          throw new Error('执行预部署脚本失败');
        }
        if (!await execSteps('执行部署脚本', steps, this.cwd)) {
          throw new Error('执行部署脚本失败');
        }
        if (!await execSteps('执行后部署脚本', post_deploy, this.cwd)) {
          throw new Error('执行后部署脚本失败');
        }
        if (!await execSteps('执行清理脚本', cleanup, this.cwd)) {
          throw new Error('执行清理脚本失败');
        }
        return true;
      } catch (err) {
        debug.log(err);
        printer.print('执行 ').yellow(job.target).print(' 部署操作失败: ').red(err.message).println();
        return false;
      }
    });
  }
}

module.exports = Deployment;
