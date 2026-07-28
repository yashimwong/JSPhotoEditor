import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['dist/**', 'node_modules/**']
    },
    {
        files: ['src/**/*.ts', 'demo/**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tseslint.parser,
            globals: globals.browser
        },
        rules: {
            eqeqeq: 'error',
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'error'
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin
        }
    },
    {
        files: ['tests/**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tseslint.parser,
            globals: { ...globals.browser, ...globals.node }
        },
        rules: {
            eqeqeq: 'error',
            'no-undef': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'error'
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin
        }
    },
    {
        files: ['*.config.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node
        },
        rules: {
            eqeqeq: 'error',
            'no-undef': 'error',
            'no-unused-vars': 'error'
        }
    }
]);
