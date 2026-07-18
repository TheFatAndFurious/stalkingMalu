import { join } from 'node:path';

import nx from '@nx/eslint-plugin';
import oxlint from 'eslint-plugin-oxlint';

// Oxlint owns the JS/TS rules (see .oxlintrc.json) and oxfmt owns formatting.
// ESLint is kept only for the Nx-specific rules that have no oxlint equivalent:
// @nx/enforce-module-boundaries and @nx/dependency-checks.
// buildFromOxlintConfigFile() reads .oxlintrc.json and turns off every ESLint rule
// oxlint already covers, so the two never report the same problem twice.
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
  // Must stay last: disables everything oxlint already reports.
  // Absolute path: per-project configs extend this file, so ESLint's cwd is the
  // project dir, not the workspace root.
  ...(await oxlint.buildFromOxlintConfigFile(join(import.meta.dirname, '.oxlintrc.json'))),
];
