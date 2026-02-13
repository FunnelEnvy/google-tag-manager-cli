import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmWorkspace {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  name: string;
  description?: string;
  fingerprint: string;
  tagManagerUrl: string;
}

interface WorkspacesListResponse {
  workspace: GtmWorkspace[];
  nextPageToken?: string;
}

function formatWorkspace(w: GtmWorkspace): Record<string, unknown> {
  return {
    account_id: w.accountId,
    container_id: w.containerId,
    workspace_id: w.workspaceId,
    name: w.name,
    description: w.description ?? '',
    tag_manager_url: w.tagManagerUrl ?? '',
  };
}

export function registerWorkspacesCommands(program: Command): void {
  const workspaces = program
    .command('workspaces')
    .description('Manage GTM workspaces');

  workspaces
    .command('list')
    .description('List workspaces in a container')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
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

        const params = new URLSearchParams();
        if (options.pageToken) params.set('pageToken', options.pageToken);

        const qs = params.toString();
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<WorkspacesListResponse>(url, { headers }),
        );

        const rows = (data.workspace ?? []).map(formatWorkspace);

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

  workspaces
    .command('get')
    .description('Get details of a specific workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--workspace-id <id>', 'GTM workspace ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${options.workspaceId}`;

        const data = await withRetry(() =>
          request<GtmWorkspace>(url, { headers }),
        );

        printOutput(formatWorkspace(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  workspaces
    .command('create')
    .description('Create a new workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--name <name>', 'Workspace name')
    .option('--description <desc>', 'Workspace description')
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

        const body: Record<string, unknown> = { name: options.name };
        if (options.description) body.description = options.description;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmWorkspace>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatWorkspace(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  workspaces
    .command('update')
    .description('Update a workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--workspace-id <id>', 'GTM workspace ID')
    .option('--name <name>', 'New workspace name')
    .option('--description <desc>', 'New workspace description')
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

        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${options.workspaceId}`;
        const current = await withRetry(() =>
          request<GtmWorkspace>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.description !== undefined) body.description = options.description;

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmWorkspace>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatWorkspace(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  workspaces
    .command('delete')
    .description('Delete a workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--workspace-id <id>', 'GTM workspace ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${options.workspaceId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Workspace ${options.workspaceId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
