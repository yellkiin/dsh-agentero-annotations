import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const profileArg = process.argv.indexOf('--profile');
const profile = profileArg < 0 ? 'web' : process.argv[profileArg + 1];
if (!profile || !/^[\w-]+$/.test(profile)) throw new Error('请填写有效的DSH profile名称');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const releases = join(homedir(), '.local/share/dsh-plugins/releases');
mkdirSync(releases, { recursive: true });
const run = (bin, args) => {
  const r = spawnSync(bin, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status || 1);
};
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', releases]);
const archive = join(releases, `${pkg.name}-${pkg.version}.tgz`);
run(process.env.DSH_BIN || (process.platform === 'win32' ? 'dsh.cmd' : 'dsh'), ['plugin', '--profile', profile, 'add', archive]);
console.log('已安装批注阅读增强插件，刷新DSH并重新打开论文即可。');
