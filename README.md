# Google Tag Manager CLI

Command-line interface for Google Tag Manager — manage accounts, containers, tags, triggers, variables, versions, and environments from the terminal.

## Install

```bash
npm install -g @funnelenvy/google-tag-manager-cli
```

## Quick Start

```bash
# Authenticate
gtm auth login --client-id YOUR_CLIENT_ID --client-secret YOUR_CLIENT_SECRET

# List accounts
gtm accounts list --output table

# List containers in an account
gtm containers list --account-id 123456 --output table

# List tags in a workspace
gtm tags list --account-id 123456 --container-id 789 --workspace-id 1 --output table

# Create a version and publish
gtm versions create --account-id 123456 --container-id 789 --workspace-id 1 --name "v2.0"
gtm versions publish --account-id 123456 --container-id 789 --version-id 5
```

## Authentication

### OAuth2 (Interactive)

Requires a Google Cloud project with the Tag Manager API enabled.

```bash
# Via flags
gtm auth login --client-id YOUR_ID --client-secret YOUR_SECRET

# Via environment variables
export GTM_CLIENT_ID=your-client-id
export GTM_CLIENT_SECRET=your-client-secret
gtm auth login
```

### Service Account

```bash
gtm auth login --service-account /path/to/service-account-key.json
```

### Direct Token

For CI/CD or scripts, provide a token directly:

```bash
export GTM_ACCESS_TOKEN=ya29.your-token
gtm accounts list

# Or via flag
gtm accounts list --access-token ya29.your-token
```

### Check Auth Status

```bash
gtm auth status
gtm auth logout
```

## Command Reference

### Accounts

```bash
gtm accounts list                         # List all accessible accounts
gtm accounts get --account-id 123456      # Get account details
```

### Containers

```bash
gtm containers list --account-id 123456
gtm containers get --account-id 123456 --container-id 789
gtm containers create --account-id 123456 --name "My Site" --usage-context web
gtm containers update --account-id 123456 --container-id 789 --name "New Name"
gtm containers delete --account-id 123456 --container-id 789 --dry-run
```

### Workspaces

```bash
gtm workspaces list --account-id 123456 --container-id 789
gtm workspaces get --account-id 123456 --container-id 789 --workspace-id 1
gtm workspaces create --account-id 123456 --container-id 789 --name "Feature Branch"
gtm workspaces delete --account-id 123456 --container-id 789 --workspace-id 1
```

### Tags

```bash
gtm tags list --account-id 123456 --container-id 789 --workspace-id 1
gtm tags get --account-id 123456 --container-id 789 --workspace-id 1 --tag-id 10
gtm tags create --account-id 123456 --container-id 789 --workspace-id 1 \
  --name "GA4 Config" --type "gaawc" --firing-trigger-id "2147479553"
gtm tags delete --account-id 123456 --container-id 789 --workspace-id 1 --tag-id 10
```

### Triggers

```bash
gtm triggers list --account-id 123456 --container-id 789 --workspace-id 1
gtm triggers create --account-id 123456 --container-id 789 --workspace-id 1 \
  --name "All Pages" --type "pageview"
```

### Variables

```bash
gtm variables list --account-id 123456 --container-id 789 --workspace-id 1
gtm variables create --account-id 123456 --container-id 789 --workspace-id 1 \
  --name "Page URL" --type "u"
```

### Versions

```bash
gtm versions list --account-id 123456 --container-id 789
gtm versions get --account-id 123456 --container-id 789 --version-id 1
gtm versions create --account-id 123456 --container-id 789 --workspace-id 1 --name "v2.0"
gtm versions publish --account-id 123456 --container-id 789 --version-id 1
```

### Environments

```bash
gtm environments list --account-id 123456 --container-id 789
gtm environments create --account-id 123456 --container-id 789 --name "Staging" --url "https://staging.example.com"
```

## Output Formats

All data commands support `--output json|table|csv` (default: `json`).

```bash
gtm accounts list --output table   # Human-readable table
gtm tags list ... --output csv     # Pipe to file or other tools
gtm tags list ... --output json    # Machine-readable (default)
```

## Configuration

Config file location: `~/.config/gtm-cli/config.json`

Set defaults to avoid repeating IDs:

```json
{
  "defaults": {
    "account_id": "123456",
    "container_id": "789",
    "workspace_id": "1"
  }
}
```

## Development

```bash
git clone https://github.com/FunnelEnvy/google-tag-manager-cli.git
cd google-tag-manager-cli
pnpm install
pnpm run build
pnpm run test
pnpm run typecheck
```

## Part of Marketing CLIs

This CLI is part of [Marketing CLIs](https://github.com/FunnelEnvy/marketing-clis) — open source CLIs for marketing tools that don't have them.

## License

MIT
