export type Platform = 'coding' | 'github';

export type WebhookEvent = 'merge_created';

export type TriggerTypes = 'cli' | 'webhook';

export type Status = 'wait' | 'closed';

export type TaskInfo = {
  platform: Platform,
  team: string,
  project: string,
  repo: string,
  event: WebhookEvent,
  source: options.source,
  target: options.target,
  trigger: TriggerTypes,
  router: string,
  json?: Record<string, any>,
  status?: Status,
  created_at?: Date,
  updated_at?: Date,
};

export interface PlatformHandler {
  getCloneLink(task: Task): string;
  getDefaultBranch(task: Task): Promise<string>;
  getMergeRequest(task: Task): Promise<Array<{ source: string, target: string, title: string }>>;
}

export interface Task {
  team: string;
  project: string;
  repo: string;
  target: string;
}

export interface DeployItem {
  on: {
    branches: string[];
    exclude_branches: string[];
  };
  deploy: {
    steps: {
      name: string;
      run: string | string[];
    }[];
  };
  scripts: {
    pre_deploy: string | string[];
    post_deploy: string | string[];
    cleanup: string | string[];
  };
}

export type DeployConfig = {
  name: string;
  env?: Record<string, string>;
  jobs?: DeployItem[];
} & DeployItem;

export interface DeployJob {
  items: DeployItem[];
  deployConfig: DeployConfig;
}

export type DeploymentOptions = { workspace: string, cwd: string, target: string, repo: string, platform: Platform, task: Task, status: Status, deployConfig: DeployConfig };

export class Deployment {
  constructor(platformHandler: PlatformHandler, options: DeploymentOptions);
  resolveJobs(): Promise<DeployJob[]>;
  execJobs(jobs: DeployJob[]): Promise<boolean>;
}


export interface Context {
  platform: Platform;
  task: Task;
  workspace: string;
  cwd: string;
  target: string;
  repo: string;
  platform: Platform;
  task: Task;
  status: Status;
  deployConfig: DeployConfig;
  deploy: Deployment;
}
