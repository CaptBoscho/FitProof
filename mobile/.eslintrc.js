module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'prettier',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-native/no-inline-styles': 'off',
    'no-console': 'warn',
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    jest: true,
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', '*.js'],
};