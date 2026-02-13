import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId, resolveContainerId, resolveWorkspaceId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmVersionHeader {
  path: string;
  accountId: string;
  containerId: string;
  containerVersionId: string;
  name?: string;
  numTags?: string;
  numTriggers?: string;
  numVariables?: string;
  deleted?: boolean;
}

interface VersionHeadersListResponse {
  containerVersionHeader: GtmVersionHeader[];
  nextPageToken?: string;
}

interface GtmContainerVersion {
  path: string;
  accountId: string;
  containerId: string;
  containerVersionId: string;
  name?: string;
  description?: string;
  fingerprint: string;
  tagManagerUrl: string;
  tag?: unknown[];
  trigger?: unknown[];
  variable?: unknown[];
}

interface CreateVersionResponse {
  containerVersion: GtmContainerVersion;
  compilerError?: boolean;
}

interface PublishVersionResponse {
  containerVersion: GtmContainerVersion;
  compilerError?: boolean;
}

function formatVersionHeader(v: GtmVersionHeader): Record<string, unknown> {
  return {
    version_id: v.containerVersionId,
    name: v.name ?? '',
    num_tags: v.numTags ?? '0',
    num_triggers: v.numTriggers ?? '0',
    num_variables: v.numVariables ?? '0',
    deleted: v.deleted ?? false,
  };
}

function formatVersion(v: GtmContainerVersion): Record<string, unknown> {
  return {
    version_id: v.containerVersionId,
    name: v.name ?? '',
    description: v.description ?? '',
    num_tags: v.tag?.length ?? 0,
    num_triggers: v.trigger?.length ?? 0,
    num_variables: v.variable?.length ?? 0,
    tag_manager_url: v.tagManagerUrl ?? '',
  };
}

export function registerVersionsCommands(program: Command): void {
  const versions = program
    .command('versions')
    .description('Manage GTM container versions');

  versions
    .command('list')
    .description('List container version headers')
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
        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/version_headers${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<VersionHeadersListResponse>(url, { headers }),
        );

        const rows = (data.containerVersionHeader ?? []).map(formatVersionHeader);

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

  versions
    .command('get')
    .description('Get a specific container version')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--version-id <id>', 'Container version ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);
        const containerId = resolveContainerId(options.containerId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/versions/${options.versionId}`;

        const data = await withRetry(() =>
          request<GtmContainerVersion>(url, { headers }),
        );

        printOutput(formatVersion(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  versions
    .command('create')
    .description('Create a new container version from a workspace')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .option('--workspace-id <id>', 'GTM workspace ID')
    .option('--name <name>', 'Version name')
    .option('--notes <notes>', 'Version notes')
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

        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;
        if (options.notes) body.notes = options.notes;

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}:create_version`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<CreateVersionResponse>(url, { method: 'POST', headers, body }),
        );

        if (data.compilerError) {
          console.error('Warning: Version created with compiler errors.');
        }

        printOutput(formatVersion(data.containerVersion), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  versions
    .command('publish')
    .description('Publish a container version')
    .option('--account-id <id>', 'GTM account ID')
    .option('--container-id <id>', 'GTM container ID')
    .requiredOption('--version-id <id>', 'Container version ID to publish')
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

        const url = `${API_BASE}/accounts/${accountId}/containers/${containerId}/versions/${options.versionId}:publish`;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${url}`);
          return;
        }

        const data = await withRetry(() =>
          request<PublishVersionResponse>(url, { method: 'POST', headers }),
        );

        if (data.compilerError) {
          console.error('Warning: Published with compiler errors.');
        }

        printOutput(formatVersion(data.containerVersion), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });
}
