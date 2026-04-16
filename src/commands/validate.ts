import { asCommandOutput, printOutput } from '../core/output';
import { validateDsl } from '../core/validator';
import { readJsonFile } from '../utils/fs';

export async function runValidate(file: string, jsonMode: boolean): Promise<number> {
  const payload = await readJsonFile(file);
  const result = validateDsl(payload);
  printOutput(asCommandOutput(result), jsonMode);
  return result.ok ? 0 : 1;
}
