import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';
import { resolveAccountId } from '../lib/context.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmContainer {
  path: string;
  accountId: string;
  containerId: string;
  name: string;
  domainName?: string[];
  publicId: string;
  usageContext: string[];
  fingerprint: string;
  tagManagerUrl: string;
  tagIds?: string[];
  notes?: string;
}

interface ContainersListResponse {
  container: GtmContainer[];
  nextPageToken?: string;
}

function formatContainer(c: GtmContainer): Record<string, unknown> {
  return {
    account_id: c.accountId,
    container_id: c.containerId,
    name: c.name,
    public_id: c.publicId,
    usage_context: (c.usageContext ?? []).join(', '),
    domain_name: (c.domainName ?? []).join(', '),
    tag_manager_url: c.tagManagerUrl ?? '',
  };
}

export function registerContainersCommands(program: Command): void {
  const containers = program
    .command('containers')
    .description('Manage GTM containers');

  containers
    .command('list')
    .description('List containers in a GTM account')
    .option('--account-id <id>', 'GTM account ID')
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

        const params = new URLSearchParams();
        if (options.pageToken) params.set('pageToken', options.pageToken);

        const qs = params.toString();
        const url = `${API_BASE}/accounts/${accountId}/containers${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<ContainersListResponse>(url, { headers }),
        );

        const rows = (data.container ?? []).map(formatContainer);

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

  containers
    .command('get')
    .description('Get details of a specific container')
    .option('--account-id <id>', 'GTM account ID')
    .requiredOption('--container-id <id>', 'GTM container ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${options.containerId}`;

        const data = await withRetry(() =>
          request<GtmContainer>(url, { headers }),
        );

        printOutput(formatContainer(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  containers
    .command('create')
    .description('Create a new container')
    .option('--account-id <id>', 'GTM account ID')
    .requiredOption('--name <name>', 'Container name')
    .requiredOption('--usage-context <ctx>', 'Usage context: web, android, ios, amp')
    .option('--domain-name <domains>', 'Comma-separated domain names')
    .option('--notes <notes>', 'Container notes')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);

        const body: Record<string, unknown> = {
          name: options.name,
          usageContext: [options.usageContext.toUpperCase()],
        };
        if (options.domainName) {
          body.domainName = options.domainName.split(',').map((d: string) => d.trim());
        }
        if (options.notes) body.notes = options.notes;

        if (options.dryRun) {
          console.log('Dry run — would POST to:');
          console.log(`  ${API_BASE}/accounts/${accountId}/containers`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const url = `${API_BASE}/accounts/${accountId}/containers`;

        const data = await withRetry(() =>
          request<GtmContainer>(url, { method: 'POST', headers, body }),
        );

        printOutput(formatContainer(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  containers
    .command('update')
    .description('Update a container')
    .option('--account-id <id>', 'GTM account ID')
    .requiredOption('--container-id <id>', 'GTM container ID')
    .option('--name <name>', 'New container name')
    .option('--notes <notes>', 'New container notes')
    .option('--domain-name <domains>', 'Comma-separated domain names')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);

        // Fetch current container first
        const getUrl = `${API_BASE}/accounts/${accountId}/containers/${options.containerId}`;
        const current = await withRetry(() =>
          request<GtmContainer>(getUrl, { headers }),
        );

        const body: Record<string, unknown> = { ...current };
        if (options.name) body.name = options.name;
        if (options.notes !== undefined) body.notes = options.notes;
        if (options.domainName) {
          body.domainName = options.domainName.split(',').map((d: string) => d.trim());
        }

        if (options.dryRun) {
          console.log('Dry run — would PUT to:');
          console.log(`  ${getUrl}`);
          console.log('Body:');
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const data = await withRetry(() =>
          request<GtmContainer>(getUrl, { method: 'PUT', headers, body }),
        );

        printOutput(formatContainer(data), format);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, format);
          process.exit(1);
        }
        throw error;
      }
    });

  containers
    .command('delete')
    .description('Delete a container')
    .option('--account-id <id>', 'GTM account ID')
    .requiredOption('--container-id <id>', 'GTM container ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--dry-run', 'Preview the request without executing')
    .action(async (options) => {
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);
        const accountId = resolveAccountId(options.accountId);

        const url = `${API_BASE}/accounts/${accountId}/containers/${options.containerId}`;

        if (options.dryRun) {
          console.log('Dry run — would DELETE:');
          console.log(`  ${url}`);
          return;
        }

        await withRetry(() =>
          request<void>(url, { method: 'DELETE', headers }),
        );

        console.log(`Container ${options.containerId} deleted.`);
      } catch (error) {
        if (error instanceof HttpError) {
          printError({ code: error.code, message: error.message, retry_after: error.retryAfter }, 'json');
          process.exit(1);
        }
        throw error;
      }
    });
}
