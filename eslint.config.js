import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['aube-lock.yaml'],
    imports: {
      overrides: {
        'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
        'import/no-duplicates': ['error', { 'prefer-inline': true }],
      },
    },
    stylistic: {
      braceStyle: '1tbs',
      jsx: false,
    },
    perfectionist: {
      overrides: {
        'perfectionist/sort-imports': [
          'error',
          {
            groups: [
              ['value-builtin', 'type-builtin'],
              ['value-external', 'type-external'],
              ['value-internal', 'type-internal'],
              [
                'value-parent',
                'type-parent',
                'value-sibling',
                'type-sibling',
                'value-index',
                'type-index',
              ],
              'side-effect',
              'ts-equals-import',
              'unknown',
            ],
            internalPattern: ['^#/'],
            newlinesBetween: 1,
            newlinesInside: 0,
            order: 'asc',
            type: 'natural',
          },
        ],
      },
    },
    typescript: {
      filesTypeAware: ['**/*.ts', '**/*.vue'],
      tsconfigPath: 'tsconfig.json',
      overrides: {
        'ts/consistent-type-imports': [
          'error',
          {
            disallowTypeAnnotations: false,
            fixStyle: 'inline-type-imports',
            prefer: 'type-imports',
          },
        ],
      },
    },
    vue: true,
  },
  {
    files: ['**/*.{js,ts,vue}'],
    rules: {
      'curly': 'error',
      'style/curly-newline': [
        'error',
        {
          consistent: true,
          minElements: 1,
        },
      ],
      'style/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var', 'if'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['const', 'let', 'var', 'if'],
        },
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'style/lines-between-class-members': ['error', 'always'],
      'style/max-len': ['warn', {
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreComments: false,
      }],
    },
  },
  {
    files: ['apps/frontend/**/*.vue'],
    rules: {
      'style/max-len': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/max-len': ['warn', {
        code: 100,
        template: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignoreHTMLAttributeValues: true,
      }],
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    files: [
      'apps/frontend/src/app/router.ts',
      'apps/frontend/src/main.ts',
    ],
    rules: {
      'ts/no-unsafe-assignment': 'off',
      'ts/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.ts'],
    rules: {
      'vitest/consistent-test-it': ['error', {
        fn: 'test',
        withinDescribe: 'test',
      }],
    },
  },
)
