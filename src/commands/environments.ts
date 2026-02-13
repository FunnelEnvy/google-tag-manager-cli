import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmEnvironment {
  path: string;
  accountId: string;
  containerId: string;
  environmentId: string;
  name: string;
  type: string;
  description?: string;
  fingerprint: string;
  tagManagerUrl: string;
  authorizationCode?: string;
  authorizationTimestamp?: string;
  containerVersionId?: string;
  url?: string;
}

interface EnvironmentsListResponse {
  environment: GtmEnvironment[];
  nextPageToken?: string;
}

function formatEnvironment(e: GtmEnvironment): Record<string, unknown> {
  return {
    environment_id: e.environmentId,
    name: e.name,
    type: e.type,
    description: e.description ?? '',
    container_version_id: e.containerVersionId ?? '',
    url: e.url ?? '',
    tag_manager_url: e.tagManagerUrl ?? '',
  };
}

export function registerEnvironmentsCommands(program: Command): void {
  const environments = program
    .command('environments')
    .description('Manage GTM environments');

  environments
    .command('list')
    .description('List environments in a container')
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
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/environments${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<EnvironmentsListResponse>(url, { headers }),
        );

        const rows = (data.environment ?? []).map(formatEnvironment);

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

  environments
    .command('get')
    .description('Get details of a specific environment')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--environment-id <id>', 'GTM environment ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/environments/${options.environmentId}`;

        const data = await withRetry(() =>
          request<GtmEnvironment>(url, { headers }),
        );

        printOutput(formatEnvironment(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  environments
    .command('create')
    .description('Create a new environment')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--name <name>', 'Environment name')
    .option('--description <desc>', 'Environment description')
    .option('--url <url>', 'Environment URL')
    .option('--container-version-id <id>', 'Container version ID to point to')
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
        if (options.url) body.url = options.url;
        if (options.containerVersionId) body.containerVersionId = options.containerVersionId;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/environments`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmEnvironment>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatEnvironment(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  environments
    .command('update')
    .description('Update an environment')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--environment-id <id>', 'GTM environment ID')
    .option('--name <name>', 'New environment name')
    .option('--description <desc>', 'New environment description')
    .option('--url <url>', 'New environment URL')
    .option('--container-version-id <id>', 'Container version ID to point to')
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

        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${containerId}/environments/${options.environmentId}`;
        const current = await withRetry(() =>
          request<GtmEnvironment>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.description !== undefined) body.description = options.description;
        if (options.url) body.url = options.url;
        if (options.containerVersionId) body.containerVersionId = options.containerVersionId;

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmEnvironment>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatEnvironment(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  environments
    .command('delete')
    .description('Delete an environment')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--environment-id <id>', 'GTM environment ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/environments/${options.environmentId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Environment ${options.environmentId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
