import { explainDsl } from '../core/validator';
import { printOutput } from '../core/output';
import { readJsonFile } from '../utils/fs';

export async function runExplain(file: string, jsonMode: boolean): Promise<number> {
  const payload = await readJsonFile(file);
  const output = explainDsl(payload);
  printOutput(output, jsonMode);
  return output.ok ? 0 : 1;
}
