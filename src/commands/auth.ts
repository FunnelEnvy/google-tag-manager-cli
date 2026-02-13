import { Command } from 'commander';
import { startOAuthLogin, setupServiceAccount, getAuthStatus, getConfig } from '../auth.js';
import { printOutput, type OutputFormat } from '../lib/output.js';

export function registerAuthCommands(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage authentication for Google Tag Manager API');

  auth
    .command('login')
    .description('Authenticate with Google Tag Manager via OAuth2 or service account')
    .option('--client-id <id>', 'Google OAuth2 client ID')
    .option('--client-secret <secret>', 'Google OAuth2 client secret')
    .option('--service-account <path>', 'Path to service account JSON key file')
    .action(async (options) => {
      if (options.serviceAccount) {
        setupServiceAccount(options.serviceAccount);
        return;
      }

      const clientId = options.clientId ?? process.env['GTM_CLIENT_ID'];
      const clientSecret = options.clientSecret ?? process.env['GTM_CLIENT_SECRET'];

      if (!clientId || !clientSecret) {
        console.error(
          'OAuth2 login requires client ID and secret. Provide them via:\n' +
            '  --client-id and --client-secret flags\n' +
            '  GTM_CLIENT_ID and GTM_CLIENT_SECRET environment variables\n\n' +
            'Or use a service account:\n' +
            '  gtm auth login --service-account /path/to/key.json',
        );
        process.exit(1);
      }

      await startOAuthLogin(clientId, clientSecret);
    });

  auth
    .command('status')
    .description('Show current authentication status')
    .option('-o, --output <format>', 'Output format (json, table, csv)', 'json')
    .action((options) => {
      const status = getAuthStatus();
      const format = options.output as OutputFormat;

      if (!status) {
        if (format === 'json') {
          console.log(JSON.stringify({ authenticated: false }, null, 2));
        } else {
          console.log('Not authenticated. Run: gtm auth login');
        }
        return;
      }

      printOutput(
        {
          authenticated: true,
          method: status.method,
          details: status.details,
          config_path: getConfig().getConfigPath(),
        },
        format,
      );
    });

  auth
    .command('logout')
    .description('Remove stored credentials')
    .action(() => {
      getConfig().clear();
      console.log('Credentials removed.');
    });
}
