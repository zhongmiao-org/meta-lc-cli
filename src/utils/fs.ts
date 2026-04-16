import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function readJsonFile(filePath: string): Promise<unknown> {
  const resolved = resolve(filePath);
  const text = await readFile(resolved, 'utf-8');
  return JSON.parse(text) as unknown;
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const resolved = resolve(filePath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}
