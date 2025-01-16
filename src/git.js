'use strict';

const os = require('os');
const path = require('path');
const { printer } = require('@axiosleo/cli-tool');
const { _find_root, _read } = require('@axiosleo/cli-tool/src/helper/fs');
const { _exec, _shell, _confirm } = require('@axiosleo/cli-tool/src/helper/cmd');

const find_git_root = async (cwd = null) => {
  return await _find_root('.git', cwd, 'Please executed in the git directory path.');
};

const curr_branch_name = async (cwd = null) => {
  cwd = await find_git_root(cwd);
  const res = await _shell('git branch |grep "*"', cwd, false);
  return res.stdout.substr(2).split('\n').join('');
};

const has_branch = async (name, cwd = null) => {
  cwd = await find_git_root(cwd);
  const res = await _shell('git branch |grep ""', cwd, false);
  return res.stdout.indexOf(` ${name + os.EOL}`) > -1;
};

const exists_branch = async (name, cwd = null) => {
  const res = await _shell('git branch -r |grep ""', cwd, false);
  return res.stdout.indexOf(` origin/${name + os.EOL}`) > -1;
};

const reset_branch = async (name, cwd = null) => {
  cwd = await find_git_root(cwd);
  await _shell('git reset --hard', cwd, false, true);
  const tmp_branch = `reset-tmp-branch-${name}-${new Date().valueOf()}`;
  await _shell('git remote update -p', cwd, false, true);
  await _shell('git remote prune origin', cwd, false, true);
  const curr = await curr_branch_name(cwd);

  if (curr !== name) {
    const has = await has_branch(name, cwd);
    await _shell('git stash', cwd, false);
    await _shell(`git checkout${!has ? ' -b' : ''} ${name}`, cwd, false, false);
  }
  await _shell(`git checkout -b ${tmp_branch}`, cwd, false, false);
  await _shell(`git branch -D ${name}`, cwd, false, false);
  await _shell(`git checkout -b ${name} --track origin/${name}`, cwd, false, false);
  await _shell(`git branch -D ${tmp_branch}`, cwd, false, false);
};

const remove_branch = async (branch, cwd = null) => {
  cwd = await find_git_root(cwd);
  await _shell(`git branch -D ${branch}`, cwd, false, false);
};

const checkout_branch = async (branch, force = true, cwd = null) => {
  cwd = await find_git_root(cwd);
  if (force) {
    await remove_branch(branch, cwd);
    await _shell(`git checkout -b ${branch} origin/${branch}`, cwd, false, false);
  } else if (await has_branch(branch, cwd)) {
    await _shell(`git checkout ${branch}`, cwd, false, false);
  } else {
    await _shell(`git checkout -b ${branch} origin/${branch}`, cwd, false, false);
  }
};

const clear_branch = async (cwd = null, confirm = true) => {
  cwd = await find_git_root(cwd);
  const curr = await curr_branch_name(cwd);
  if (!confirm || await _confirm(`Are you sure you want to clear branch. current branch is ${curr.green}`, true)) {
    try {
      printer.warning('will clear following branch:');
      await _exec(`git branch | grep -v "* ${curr}"`, cwd);
      if (!confirm || await _confirm('confirm?', true)) {
        await _exec(`git branch | grep -v "* ${curr}" | xargs git branch -D`, cwd);
        await _exec('git remote prune origin', cwd);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.stderr);
      printer.input('nothing to do.').println();
    }
  }
};

const get_repo_from_config = async (cwd = null) => {
  cwd = await find_git_root(cwd);
  let content = await _read(path.join(cwd, '.git/config'));
  const index = content.indexOf('git@github.com:');
  return content.substr(index + 15, content.indexOf('.git', index) - index - 15);
};

async function is_need_merge(branch, git_dir) {
  const result = await _shell(`git --no-pager log origin/${branch}..origin/master --no-merges --oneline -n 1`, git_dir, false);
  return !!result.stdout;
}

async function repo_link(git_dir) {
  let content = await _read(path.join(git_dir, '.git/config'));
  const index = content.indexOf('git@github.com:');
  return content.substr(index + 15, content.indexOf('.git', index) - index - 15);
}

async function open_repo(git_dir) {
  const repo = await repo_link(git_dir);
  await _shell(`open https://github.com/${repo}`);
}

async function behind_commits(source, target, cwd = null) {
  const res = await _shell(`git --no-pager log origin/${target}..origin/${source} --no-merges --oneline`, cwd, false);
  if (!res.stdout) {
    return 0;
  }
  return res.stdout.split('\n').length - 1;
}

async function git_branchs(cwd) {
  cwd = await find_git_root(cwd);
  const res = await _shell('git branch', cwd, false, false);
  return res.stdout || '';
}

async function get_commit_id(cwd) {
  cwd = await find_git_root(cwd);
  const res = await _shell('git rev-parse --verify HEAD', cwd, false, false);
  return res.stdout ? res.stdout.trim() : '';
}

async function get_commit_date(commit_id, cwd) {
  const res = await _shell('git show -s --format=%ci ' + commit_id, cwd, false, false);
  return res.stdout ? res.stdout.trim() : '';
}

module.exports = {
  path: { root: find_git_root },
  commit: {
    id: get_commit_id,
    date: get_commit_date
  },
  branch: {
    has: has_branch,
    exist: exists_branch,
    reset: reset_branch,
    curr: curr_branch_name,
    clear: clear_branch,
    compare: behind_commits,
    list: git_branchs,
    remove: remove_branch,
    checkout: checkout_branch
  },
  repo: {
    name: get_repo_from_config,
    link: repo_link,
    open: open_repo,
  },
  pr: { check_merge: is_need_merge }
};
