export type Platform = 'coding' | 'github';

export type WebhookEvent = 'merge_created';

export type TriggerTypes = 'cli' | 'webhook';

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
  status?: 'wait' | 'closed',
  created_at?: Date,
  updated_at?: Date,
};
