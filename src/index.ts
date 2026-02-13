import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth.js';
import { registerAccountsCommands } from './commands/accounts.js';
import { registerContainersCommands } from './commands/containers.js';
import { registerWorkspacesCommands } from './commands/workspaces.js';
import { registerTagsCommands } from './commands/tags.js';
import { registerTriggersCommands } from './commands/triggers.js';
import { registerVariablesCommands } from './commands/variables.js';
import { registerVersionsCommands } from './commands/versions.js';
import { registerEnvironmentsCommands } from './commands/environments.js';

const program = new Command();

program
  .name('gtm')
  .description(
    'Command-line interface for Google Tag Manager — manage accounts, containers, tags, triggers, and variables',
  )
  .version('0.1.0');

registerAuthCommands(program);
registerAccountsCommands(program);
registerContainersCommands(program);
registerWorkspacesCommands(program);
registerTagsCommands(program);
registerTriggersCommands(program);
registerVariablesCommands(program);
registerVersionsCommands(program);
registerEnvironmentsCommands(program);

program.parse();
