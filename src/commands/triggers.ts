import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId, resolveWorkspaceId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmCondition {
  type: string;
  parameter: Array<{ type: string; key: string; value: string }>;
}

interface GtmTrigger {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  triggerId: string;
  name: string;
  type: string;
  filter?: GtmCondition[];
  autoEventFilter?: GtmCondition[];
  customEventFilter?: GtmCondition[];
  fingerprint: string;
  tagManagerUrl: string;
  notes?: string;
}

interface TriggersListResponse {
  trigger: GtmTrigger[];
  nextPageToken?: string;
}

function formatTrigger(t: GtmTrigger): Record<string, unknown> {
  return {
    trigger_id: t.triggerId,
    name: t.name,
    type: t.type,
    tag_manager_url: t.tagManagerUrl ?? '',
  };
}

export function registerTriggersCommands(program: Command): void {
  const triggers = program
    .command('triggers')
    .description('Manage GTM triggers');

  triggers
    .command('list')
    .description('List triggers in a workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--page-token <token>', 'Page token for pagination')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .option('-q, --quiet', 'Suppress non-essential output')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const params = new URLSearchParams();
        if (options.pageToken) params.set('pageToken', options.pageToken);

        const qs = params.toString();
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<TriggersListResponse>(url, { headers }),
        );

        const rows = (data.trigger ?? []).map(formatTrigger);

        if (!options.quiet && data.nextPageToken) {
          console.error(`Next page token: ${data.nextPageToken}`);
        }

        printOutput(rows, format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  triggers
    .command('get')
    .description('Get details of a specific trigger')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--trigger-id <id>', 'GTM trigger ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${options.triggerId}`;

        const data = await withRetry(() =>
          request<GtmTrigger>(url, { headers }),
        );

        printOutput(
          {
            ...formatTrigger(data),
            filter: data.filter ? JSON.stringify(data.filter) : '',
            custom_event_filter: data.customEventFilter ? JSON.stringify(data.customEventFilter) : '',
            auto_event_filter: data.autoEventFilter ? JSON.stringify(data.autoEventFilter) : '',
            notes: data.notes ?? '',
          },
          format,
        );
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  triggers
    .command('create')
    .description('Create a new trigger')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--name <name>', 'Trigger name')
    .requiredOption('--type <type>', 'Trigger type (e.g., "pageview", "click", "customEvent")')
    .option('--filter <json>', 'Trigger filter conditions as JSON array')
    .option('--custom-event-filter <json>', 'Custom event filter conditions as JSON array')
    .option('--notes <notes>', 'Trigger notes')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const body: Record<string, unknown> = {
          name: options.name,
          type: options.type,
        };
        if (options.filter) body.filter = JSON.parse(options.filter);
        if (options.customEventFilter) body.customEventFilter = JSON.parse(options.customEventFilter);
        if (options.notes) body.notes = options.notes;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmTrigger>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatTrigger(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  triggers
    .command('update')
    .description('Update a trigger')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--trigger-id <id>', 'GTM trigger ID')
    .option('--name <name>', 'New trigger name')
    .option('--type <type>', 'New trigger type')
    .option('--filter <json>', 'Trigger filter conditions as JSON array')
    .option('--custom-event-filter <json>', 'Custom event filter conditions as JSON array')
    .option('--notes <notes>', 'Trigger notes')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${options.triggerId}`;
        const current = await withRetry(() =>
          request<GtmTrigger>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.type) body.type = options.type;
        if (options.filter) body.filter = JSON.parse(options.filter);
        if (options.customEventFilter) body.customEventFilter = JSON.parse(options.customEventFilter);
        if (options.notes !== undefined) body.notes = options.notes;

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmTrigger>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatTrigger(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  triggers
    .command('delete')
    .description('Delete a trigger')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--trigger-id <id>', 'GTM trigger ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${options.triggerId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Trigger ${options.triggerId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
