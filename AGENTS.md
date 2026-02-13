# Google Tag Manager CLI — Agent Reference

## Command Inventory

### Authentication

```
gtm auth login --client-id <id> --client-secret <secret>
gtm auth login --service-account <path>
gtm auth status [-o json|table|csv]
gtm auth logout
```

### Accounts

```
gtm accounts list [--page-token <token>] [-o json|table|csv]
gtm accounts get --account-id <id> [-o json|table|csv]
```

### Containers

```
gtm containers list --account-id <id> [--page-token <token>] [-o json|table|csv]
gtm containers get --account-id <id> --container-id <id> [-o json|table|csv]
gtm containers create --account-id <id> --name <name> --usage-context <web|android|ios|amp> [--domain-name <domains>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm containers update --account-id <id> --container-id <id> [--name <name>] [--notes <notes>] [--domain-name <domains>] [--dry-run] [-o json|table|csv]
gtm containers delete --account-id <id> --container-id <id> [--dry-run]
```

### Workspaces

```
gtm workspaces list --account-id <id> --container-id <id> [--page-token <token>] [-o json|table|csv]
gtm workspaces get --account-id <id> --container-id <id> --workspace-id <id> [-o json|table|csv]
gtm workspaces create --account-id <id> --container-id <id> --name <name> [--description <desc>] [--dry-run] [-o json|table|csv]
gtm workspaces update --account-id <id> --container-id <id> --workspace-id <id> [--name <name>] [--description <desc>] [--dry-run] [-o json|table|csv]
gtm workspaces delete --account-id <id> --container-id <id> --workspace-id <id> [--dry-run]
```

### Tags

```
gtm tags list --account-id <id> --container-id <id> --workspace-id <id> [--page-token <token>] [-o json|table|csv]
gtm tags get --account-id <id> --container-id <id> --workspace-id <id> --tag-id <id> [-o json|table|csv]
gtm tags create --account-id <id> --container-id <id> --workspace-id <id> --name <name> --type <type> [--parameter <json>] [--firing-trigger-id <ids>] [--blocking-trigger-id <ids>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm tags update --account-id <id> --container-id <id> --workspace-id <id> --tag-id <id> [--name <name>] [--parameter <json>] [--firing-trigger-id <ids>] [--blocking-trigger-id <ids>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm tags delete --account-id <id> --container-id <id> --workspace-id <id> --tag-id <id> [--dry-run]
```

### Triggers

```
gtm triggers list --account-id <id> --container-id <id> --workspace-id <id> [--page-token <token>] [-o json|table|csv]
gtm triggers get --account-id <id> --container-id <id> --workspace-id <id> --trigger-id <id> [-o json|table|csv]
gtm triggers create --account-id <id> --container-id <id> --workspace-id <id> --name <name> --type <type> [--filter <json>] [--custom-event-filter <json>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm triggers update --account-id <id> --container-id <id> --workspace-id <id> --trigger-id <id> [--name <name>] [--type <type>] [--filter <json>] [--custom-event-filter <json>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm triggers delete --account-id <id> --container-id <id> --workspace-id <id> --trigger-id <id> [--dry-run]
```

### Variables

```
gtm variables list --account-id <id> --container-id <id> --workspace-id <id> [--page-token <token>] [-o json|table|csv]
gtm variables get --account-id <id> --container-id <id> --workspace-id <id> --variable-id <id> [-o json|table|csv]
gtm variables create --account-id <id> --container-id <id> --workspace-id <id> --name <name> --type <type> [--parameter <json>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm variables update --account-id <id> --container-id <id> --workspace-id <id> --variable-id <id> [--name <name>] [--type <type>] [--parameter <json>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm variables delete --account-id <id> --container-id <id> --workspace-id <id> --variable-id <id> [--dry-run]
```

### Versions

```
gtm versions list --account-id <id> --container-id <id> [--page-token <token>] [-o json|table|csv]
gtm versions get --account-id <id> --container-id <id> --version-id <id> [-o json|table|csv]
gtm versions create --account-id <id> --container-id <id> --workspace-id <id> [--name <name>] [--notes <notes>] [--dry-run] [-o json|table|csv]
gtm versions publish --account-id <id> --container-id <id> --version-id <id> [--dry-run] [-o json|table|csv]
```

### Environments

```
gtm environments list --account-id <id> --container-id <id> [--page-token <token>] [-o json|table|csv]
gtm environments get --account-id <id> --container-id <id> --environment-id <id> [-o json|table|csv]
gtm environments create --account-id <id> --container-id <id> --name <name> [--description <desc>] [--url <url>] [--container-version-id <id>] [--dry-run] [-o json|table|csv]
gtm environments update --account-id <id> --container-id <id> --environment-id <id> [--name <name>] [--description <desc>] [--url <url>] [--container-version-id <id>] [--dry-run] [-o json|table|csv]
gtm environments delete --account-id <id> --container-id <id> --environment-id <id> [--dry-run]
```

## Auth Requirements

**OAuth2 (interactive):** Requires Google Cloud project with Tag Manager API enabled.
- Set `GTM_CLIENT_ID` and `GTM_CLIENT_SECRET` env vars, then run `gtm auth login`
- Or pass `--client-id` and `--client-secret` flags

**Service Account:** Requires service account JSON key file with Tag Manager access.
- Run `gtm auth login --service-account /path/to/key.json`

**Direct Token:** For scripting/CI.
- Set `GTM_ACCESS_TOKEN` env var
- Or pass `--access-token` flag on any command

**Token resolution order:** `--access-token` flag > `GTM_ACCESS_TOKEN` env > config file

## Common Workflows

### List all accounts and containers

```bash
gtm accounts list --output table
gtm containers list --account-id 123456 --output table
```

### List all tags in a workspace

```bash
gtm tags list \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --output table
```

### Create a new tag with a firing trigger

```bash
gtm tags create \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --name "GA4 Event" \
  --type "gaawc" \
  --firing-trigger-id "2147479553" \
  --output table
```

### Create a version and publish

```bash
gtm versions create \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --name "v2.0 - Added GA4 tags"

gtm versions publish \
  --account-id 123456 \
  --container-id 789 \
  --version-id 5
```

### List triggers and variables

```bash
gtm triggers list \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --output table

gtm variables list \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --output table
```

### Export tags as CSV

```bash
gtm tags list \
  --account-id 123456 \
  --container-id 789 \
  --workspace-id 1 \
  --output csv > tags.csv
```

### Preview a mutation with --dry-run

```bash
gtm containers delete \
  --account-id 123456 \
  --container-id 789 \
  --dry-run
```

## Context Defaults

Set defaults in `~/.config/gtm-cli/config.json` to avoid repeating IDs:

```json
{
  "defaults": {
    "account_id": "123456",
    "container_id": "789",
    "workspace_id": "1"
  }
}
```

When defaults are set, `--account-id`, `--container-id`, and `--workspace-id` flags become optional.

## Output Format Notes

### JSON output (default)

All list commands return arrays of flat objects:

```json
[
  {
    "tag_id": "10",
    "name": "GA4 Config",
    "type": "gaawc",
    "firing_triggers": "1",
    "blocking_triggers": "",
    "paused": false,
    "tag_manager_url": "https://tagmanager.google.com/..."
  }
]
```

### Versions list JSON

```json
[
  {
    "version_id": "1",
    "name": "v1.0",
    "num_tags": "5",
    "num_triggers": "3",
    "num_variables": "2",
    "deleted": false
  }
]
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `AUTH_FAILED` | Invalid or expired credentials | Run `gtm auth login` |
| `NOT_FOUND` | Resource doesn't exist | Check the IDs provided |
| `RATE_LIMITED` | API rate limit exceeded | Wait and retry (auto-retry built in) |
| `API_ERROR` | General API error | Check error message for details |

## Rate Limits

- Google Tag Manager API: 0.25 QPS per user, daily quotas per project
- Auto-retry with exponential backoff on 429 responses
- Use `--quiet` to suppress retry status messages
