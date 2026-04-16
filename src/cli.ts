#!/usr/bin/env node
import { Command } from 'commander';
import { runE2e } from './commands/e2e';
import { runExplain } from './commands/explain';
import { runGenerate } from './commands/generate';
import { runInit } from './commands/init';
import { runTemplate } from './commands/template';
import { runValidate } from './commands/validate';

async function main(): Promise<void> {
  const program = new Command();

  program.name('meta-lc').description('Meta LowCode CLI').version('0.1.0');

  program
    .command('init')
    .description('Generate a minimal valid App DSL template')
    .requiredOption('--out <path>', 'Output file path')
    .action(async (options: { out: string }) => {
      await runInit(options.out);
    });

  program
    .command('e2e')
    .description('Run end-to-end checks (validate + generate + template + BFF integration)')
    .requiredOption('--file <path>', 'DSL JSON file path')
    .option('--json', 'JSON output mode', false)
    .option('--out <dir>', 'Sub directory under ./out')
    .option('--bff-url <url>', 'BFF base URL')
    .option('--tenant-a <id>', 'Tenant A id')
    .option('--tenant-b <id>', 'Tenant B id')
    .option('--user-id <id>', 'Tenant A user id')
    .option('--roles <csv>', 'Roles list, comma-separated')
    .action(
      async (options: {
        file: string;
        json?: boolean;
        out?: string;
        bffUrl?: string;
        tenantA?: string;
        tenantB?: string;
        userId?: string;
        roles?: string;
      }) => {
        process.exitCode = await runE2e({
          file: options.file,
          jsonMode: Boolean(options.json),
          out: options.out,
          bffUrl: options.bffUrl,
          tenantA: options.tenantA,
          tenantB: options.tenantB,
          userId: options.userId,
          roles: options.roles
        });
      }
    );

  program
    .command('generate')
    .description('Generate pipeline plan and optional artifacts from App DSL')
    .requiredOption('--file <path>', 'DSL JSON file path')
    .option('--json', 'JSON output mode', false)
    .option('--write', 'Write DB/API/Perm/Page files to out directory', false)
    .option('--out <dir>', 'Sub directory under ./out')
    .action(async (options: { file: string; json?: boolean; write?: boolean; out?: string }) => {
      process.exitCode = await runGenerate({
        file: options.file,
        jsonMode: Boolean(options.json),
        write: Boolean(options.write),
        out: options.out
      });
    });

  program
    .command('template')
    .description('Generate tenant/role template from App DSL')
    .requiredOption('--file <path>', 'DSL JSON file path')
    .option('--json', 'JSON output mode', false)
    .option('--write', 'Write template file to out directory', false)
    .option('--out <dir>', 'Sub directory under ./out')
    .action(async (options: { file: string; json?: boolean; write?: boolean; out?: string }) => {
      process.exitCode = await runTemplate({
        file: options.file,
        jsonMode: Boolean(options.json),
        write: Boolean(options.write),
        out: options.out
      });
    });

  program
    .command('validate')
    .description('Validate App DSL by app-dsl.v1 schema')
    .requiredOption('--file <path>', 'DSL JSON file path')
    .option('--json', 'JSON output mode', false)
    .action(async (options: { file: string; json?: boolean }) => {
      process.exitCode = await runValidate(options.file, Boolean(options.json));
    });

  program
    .command('explain')
    .description('Explain App DSL summary with validation result')
    .requiredOption('--file <path>', 'DSL JSON file path')
    .option('--json', 'JSON output mode', false)
    .action(async (options: { file: string; json?: boolean }) => {
      process.exitCode = await runExplain(options.file, Boolean(options.json));
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
