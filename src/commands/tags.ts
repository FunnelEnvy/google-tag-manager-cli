import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId, resolveWorkspaceId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmParameter {
  type: string;
  key: string;
  value?: string;
  list?: GtmParameter[];
  map?: GtmParameter[];
}

interface GtmTag {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  tagId: string;
  name: string;
  type: string;
  parameter?: GtmParameter[];
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  fingerprint: string;
  tagManagerUrl: string;
  paused?: boolean;
  notes?: string;
}

interface TagsListResponse {
  tag: GtmTag[];
  nextPageToken?: string;
}

function formatTag(t: GtmTag): Record<string, unknown> {
  return {
    tag_id: t.tagId,
    name: t.name,
    type: t.type,
    firing_triggers: (t.firingTriggerId ?? []).join(', '),
    blocking_triggers: (t.blockingTriggerId ?? []).join(', '),
    paused: t.paused ?? false,
    tag_manager_url: t.tagManagerUrl ?? '',
  };
}

export function registerTagsCommands(program: Command): void {
  const tags = program
    .command('tags')
    .description('Manage GTM tags');

  tags
    .command('list')
    .description('List tags in a workspace')
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
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<TagsListResponse>(url, { headers }),
        );

        const rows = (data.tag ?? []).map(formatTag);

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

  tags
    .command('get')
    .description('Get details of a specific tag')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--tag-id <id>', 'GTM tag ID')
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

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${options.tagId}`;

        const data = await withRetry(() =>
          request<GtmTag>(url, { headers }),
        );

        printOutput(
          {
            ...formatTag(data),
            parameters: data.parameter ? JSON.stringify(data.parameter) : '',
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

  tags
    .command('create')
    .description('Create a new tag')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--name <name>', 'Tag name')
    .requiredOption('--type <type>', 'Tag type (e.g., "ua", "awct", "html")')
    .option('--parameter <json>', 'Tag parameters as JSON array')
    .option('--firing-trigger-id <ids>', 'Comma-separated firing trigger IDs')
    .option('--blocking-trigger-id <ids>', 'Comma-separated blocking trigger IDs')
    .option('--notes <notes>', 'Tag notes')
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
        if (options.parameter) body.parameter = JSON.parse(options.parameter);
        if (options.firingTriggerId) body.firingTriggerId = options.firingTriggerId.split(',').map((s: string) => s.trim());
        if (options.blockingTriggerId) body.blockingTriggerId = options.blockingTriggerId.split(',').map((s: string) => s.trim());
        if (options.notes) body.notes = options.notes;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmTag>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatTag(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  tags
    .command('update')
    .description('Update a tag')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--tag-id <id>', 'GTM tag ID')
    .option('--name <name>', 'New tag name')
    .option('--parameter <json>', 'Tag parameters as JSON array')
    .option('--firing-trigger-id <ids>', 'Comma-separated firing trigger IDs')
    .option('--blocking-trigger-id <ids>', 'Comma-separated blocking trigger IDs')
    .option('--notes <notes>', 'Tag notes')
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

        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${options.tagId}`;
        const current = await withRetry(() =>
          request<GtmTag>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.parameter) body.parameter = JSON.parse(options.parameter);
        if (options.firingTriggerId) body.firingTriggerId = options.firingTriggerId.split(',').map((s: string) => s.trim());
        if (options.blockingTriggerId) body.blockingTriggerId = options.blockingTriggerId.split(',').map((s: string) => s.trim());
        if (options.notes !== undefined) body.notes = options.notes;

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmTag>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatTag(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  tags
    .command('delete')
    .description('Delete a tag')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--tag-id <id>', 'GTM tag ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${options.tagId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Tag ${options.tagId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
