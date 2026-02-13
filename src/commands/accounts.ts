import { Command } from 'commander';
import { requireAccessToken, getAuthHeaders } from '../auth.js';
import { request, withRetry, HttpError } from '../lib/http.js';
import { printOutput, printError, type OutputFormat } from '../lib/output.js';

const API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

interface GtmAccount {
  path: string;
  accountId: string;
  name: string;
  shareData: boolean;
  fingerprint: string;
  tagManagerUrl: string;
}

interface AccountsListResponse {
  account: GtmAccount[];
  nextPageToken?: string;
}

export function registerAccountsCommands(program: Command): void {
  const accounts = program
    .command('accounts')
    .description('Manage Google Tag Manager accounts');

  accounts
    .command('list')
    .description('List all GTM accounts accessible to the authenticated user')
    .option('--access-token <token>', 'Access token for authentication')
    .option('--page-token <token>', 'Page token for pagination')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .option('-q, --quiet', 'Suppress non-essential output')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);

        const params = new URLSearchParams();
        if (options.pageToken) params.set('pageToken', options.pageToken);

        const qs = params.toString();
        const url = `${API_BASE}/accounts${qs ? `?${qs}` : ''}`;

        const data = await withRetry(() =>
          request<AccountsListResponse>(url, { headers }),
        );

        const rows = (data.account ?? []).map((a) => ({
          account_id: a.accountId,
          name: a.name,
          share_data: a.shareData,
          tag_manager_url: a.tagManagerUrl ?? '',
        }));

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

  accounts
    .command('get')
    .description('Get details of a specific GTM account')
    .requiredOption('--account-id <id>', 'GTM account ID')
    .option('--access-token <token>', 'Access token for authentication')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      const format = options.output as OutputFormat;
      try {
        const token = await requireAccessToken(options.accessToken);
        const headers = getAuthHeaders(token);

        const url = `${API_BASE}/accounts/${options.accountId}`;

        const data = await withRetry(() =>
          request<GtmAccount>(url, { headers }),
        );

        printOutput(
          {
            account_id: data.accountId,
            name: data.name,
            share_data: data.shareData,
            tag_manager_url: data.tagManagerUrl ?? '',
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
}
