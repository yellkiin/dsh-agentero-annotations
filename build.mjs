import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
await (await import('./scripts/prepare-reader.mjs')).prepareReader();
const esbuild = require(process.env.ESBUILD_PACKAGE || 'esbuild');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const modules = process.env.DSH_PROFILE_NODE_MODULES || join(homedir(), '.dsh/profiles/web/node_modules');
const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/reader/index.ts'],
  nodePaths: [resolve(modules)],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2023',
  jsx: 'automatic',
  write: false,
  legalComments: 'inline',
  plugins: [{
    name: 'dsh-platform-modules',
    setup(build) {
      build.onResolve({ filter: /^(?:react|react-dom)(?:\/|$)/ }, ({ path }) => ({ path, external: true }));
      build.onResolve({ filter: /^@deepseek-ai\/(?:cordis$|dsh-(?:client|api)-)/ }, ({ path }) => ({ path, external: true }));
      build.onLoad({ filter: /pdfium[/\\].*\.js$/ }, args => {
        if (!args.path.includes('@embedpdf')) return;
        return { contents: readFileSync(args.path, 'utf8').replaceAll('import.meta.url', '(location.origin + "/agentero/api/pdfium.wasm")'), loader: 'js' };
      });
    },
  }],
});
const output = result.outputFiles[0].text;
mkdirSync(join(root, 'lib'), { recursive: true });
copyFileSync(join(root, 'src/index.js'), join(root, 'lib/index.js'));
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
const style = `if (!document.getElementById('dsh-agentero-annotations-style')) { const s = document.createElement('style'); s.id = 'dsh-agentero-annotations-style'; s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); }`;
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{var module={exports:{}};var exports=module.exports;${style}\n${output}\nreturn module.exports;}});\n`);
console.log(`Built ${pkg.name}@${pkg.version}`);
