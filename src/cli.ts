#!/usr/bin/env node
import { Command } from 'commander';
import { runExplain } from './commands/explain';
import { runInit } from './commands/init';
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
