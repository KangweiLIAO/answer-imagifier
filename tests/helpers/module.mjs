import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { resolve, dirname } from 'node:path';

// esbuild loads real module syntax and assets. Mock only explicitly named
// dependency boundaries; the entry point and remaining modules stay real.
export async function loadModule(entry, { globals = {}, mocks = {} } = {}) {
  const dependencies = Object.fromEntries(Object.entries(mocks).map(([path, value]) => [resolve(path), value]));
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'iife', globalName: 'testedModule',
    loader: { '.css': 'text', '.svg': 'text', '.png': 'dataurl' },
    plugins: [{
      name: 'test-dependencies',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, args => {
          const path = resolve(args.importer ? dirname(args.importer) : process.cwd(), args.path);
          if (Object.hasOwn(dependencies, path)) return { path, namespace: 'test-dependency' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'test-dependency' }, args => ({
          contents: Object.keys(dependencies[args.path]).map(name =>
            name === 'default'
              ? `export default globalThis.testDependencies[${JSON.stringify(args.path)}].default;`
              : `export const ${name} = globalThis.testDependencies[${JSON.stringify(args.path)}][${JSON.stringify(name)}];`
          ).join('\n'),
        }));
      },
    }],
  });
  const context = { ...globals, testDependencies: dependencies };
  runInNewContext(result.outputFiles[0].text, context, { filename: entry });
  return context.testedModule;
}
