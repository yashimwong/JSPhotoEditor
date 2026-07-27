import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: globals.browser
        },
        rules: {
            eqeqeq: 'error',
            'no-undef': 'error',
            'no-unused-vars': 'error'
        }
    },
    {
        files: ['tests/**/*.js', '*.config.js'],
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
