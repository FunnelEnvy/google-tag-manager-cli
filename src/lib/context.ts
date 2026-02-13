import { ConfigManager } from './config.js';

const config = new ConfigManager('gtm');

export function resolveAccountId(flagValue?: string): string {
  const value = flagValue ?? config.get('defaults')?.account_id;
  if (!value) {
    console.error(
      'Account ID required. Provide via --account-id flag or set a default in ~/.config/gtm-cli/config.json',
    );
    process.exit(1);
  }
  return value;
}

export function resolveContainerId(flagValue?: string): string {
  const value = flagValue ?? config.get('defaults')?.container_id;
  if (!value) {
    console.error(
      'Container ID required. Provide via --container-id flag or set a default in ~/.config/gtm-cli/config.json',
    );
    process.exit(1);
  }
  return value;
}

export function resolveWorkspaceId(flagValue?: string): string {
  const value = flagValue ?? config.get('defaults')?.workspace_id;
  if (!value) {
    console.error(
      'Workspace ID required. Provide via --workspace-id flag or set a default in ~/.config/gtm-cli/config.json',
    );
    process.exit(1);
  }
  return value;
}
