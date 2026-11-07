import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, cp, rm, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

export const upstream = {
  repository: 'poco-ai/agentero-dsh-plugin',
  commit: '3b995b9751350331210e70130330f7fb52955ef9',
  version: '0.1.5',
};
const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function prepareReader() {
  const cache = join(root, '.upstream', upstream.commit);
  let cached = false;
  try { await access(join(cache, 'packages/pdf/src/client/pdf-panel.tsx')); cached = true; } catch {}
  if (!cached) {
    await mkdir(cache, { recursive: true });
    const archive = join(root, '.upstream', 'reader-source.tgz');
    const response = await fetch(`https://codeload.github.com/${upstream.repository}/tar.gz/${upstream.commit}`);
    if (!response.ok) throw new Error(`上游源码下载失败：HTTP ${response.status}`);
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
    const unpack = spawnSync('tar', ['-xzf', archive, '-C', cache, '--strip-components=1'], { stdio: 'inherit' });
    if (unpack.status !== 0) throw new Error('解压上游源码失败，请确认系统tar命令可用');
  }
  const reader = join(root, 'src/reader');
  await rm(reader, { recursive: true, force: true });
  await cp(join(cache, 'packages/pdf/src/client'), reader, { recursive: true });
  const patches = JSON.parse(await readFile(join(root, 'src/reader-patch.json'), 'utf8'));
  for (const patch of patches) {
    const path = join(reader, patch.file);
    let contents = await readFile(path, 'utf8');
    for (const change of patch.changes) {
      if (contents.split(change.old).length !== 2) throw new Error(`补丁与上游版本不匹配：${patch.file}`);
      contents = contents.replace(change.old, () => change.new);
    }
    await writeFile(path, contents);
  }
  console.log(`Prepared Agentero reader ${upstream.version} with annotation enhancements`);
}
