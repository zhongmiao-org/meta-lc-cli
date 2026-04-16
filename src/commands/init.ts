import { resolve } from 'node:path';
import { createAppDslTemplate } from '../core/template';
import { writeJsonFile } from '../utils/fs';

export async function runInit(outFile: string): Promise<void> {
  const target = resolve(outFile);
  await writeJsonFile(target, createAppDslTemplate());
  console.log(`Generated App DSL template: ${target}`);
  console.log('Notes: 编辑 app/tenants/roles/resources/pages 后执行 `meta-lc validate --file <path>`。');
}
