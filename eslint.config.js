import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    {
        ignores: ['build/**', 'coverage/**', 'node_modules/**'],
    },
    ...tseslint.configs.recommended,
    ...tseslint.configs.strict,
    eslintConfigPrettier,
    {
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2023,
                sourceType: 'module',
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
);
