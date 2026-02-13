import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId, resolveWorkspaceId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmVariable {
  path: string;
  accountId: string;
  containerId: string;
  workspaceId: string;
  variableId: string;
  name: string;
  type: string;
  parameter?: Array<{ type: string; key: string; value?: string }>;
  fingerprint: string;
  tagManagerUrl: string;
  notes?: string;
}

interface VariablesListResponse {
  variable: GtmVariable[];
  nextPageToken?: string;
}

function formatVariable(v: GtmVariable): Record<string, unknown> {
  return {
    variable_id: v.variableId,
    name: v.name,
    type: v.type,
    tag_manager_url: v.tagManagerUrl ?? '',
  };
}

export function registerVariablesCommands(program: Command): void {
  const variables = program
    .command('variables')
    .description('Manage GTM variables');

  variables
    .command('list')
    .description('List variables in a workspace')
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
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<VariablesListResponse>(url, { headers }),
        );

        const rows = (data.variable ?? []).map(formatVariable);

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

  variables
    .command('get')
    .description('Get details of a specific variable')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--variable-id <id>', 'GTM variable ID')
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

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${options.variableId}`;

        const data = await withRetry(() =>
          request<GtmVariable>(url, { headers }),
        );

        printOutput(
          {
            ...formatVariable(data),
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

  variables
    .command('create')
    .description('Create a new variable')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--name <name>', 'Variable name')
    .requiredOption('--type <type>', 'Variable type (e.g., "v", "jsm", "gas")')
    .option('--parameter <json>', 'Variable parameters as JSON array')
    .option('--notes <notes>', 'Variable notes')
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
        if (options.notes) body.notes = options.notes;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmVariable>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatVariable(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  variables
    .command('update')
    .description('Update a variable')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--variable-id <id>', 'GTM variable ID')
    .option('--name <name>', 'New variable name')
    .option('--type <type>', 'New variable type')
    .option('--parameter <json>', 'Variable parameters as JSON array')
    .option('--notes <notes>', 'Variable notes')
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

        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${options.variableId}`;
        const current = await withRetry(() =>
          request<GtmVariable>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.type) body.type = options.type;
        if (options.parameter) body.parameter = JSON.parse(options.parameter);
        if (options.notes !== undefined) body.notes = options.notes;

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmVariable>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatVariable(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  variables
    .command('delete')
    .description('Delete a variable')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .requiredOption('--variable-id <id>', 'GTM variable ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);
        const workspaceId = resolveWorkspaceId(options.workspaceId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables/${options.variableId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Variable ${options.variableId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
