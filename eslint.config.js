export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // 定義全局變量
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        // Node.js 全局變量
        Buffer: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // 定義規則
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
