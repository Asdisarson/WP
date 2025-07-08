module.exports = {
    env: {
        browser: false,
        commonjs: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended',
        'prettier'
    ],
    plugins: ['node'],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
    },
    rules: {
        // Possible Errors
        'no-console': 'off', // Allow console in Node.js apps
        'no-debugger': 'error',
        'no-duplicate-case': 'error',
        'no-empty': 'error',
        'no-extra-semi': 'error',
        'no-unreachable': 'error',

        // Best Practices
        'curly': 'error',
        'eqeqeq': ['error', 'always'],
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-wrappers': 'error',
        'no-throw-literal': 'error',
        'no-unused-vars': ['error', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_' 
        }],
        'prefer-const': 'error',

        // Stylistic Issues
        'indent': ['error', 4, { 'SwitchCase': 1 }],
        'quotes': ['error', 'single', { 'avoidEscape': true }],
        'semi': ['error', 'always'],
        'comma-trailing': 'off',
        'max-len': ['warn', { 
            'code': 120, 
            'ignoreComments': true, 
            'ignoreUrls': true 
        }],

        // Node.js specific
        'node/no-unpublished-require': 'off',
        'node/no-missing-require': 'error',
        'node/no-deprecated-api': 'warn',
        'node/prefer-global/process': 'error',
        'node/prefer-global/buffer': 'error',

        // Security
        'no-new-func': 'error',
        'no-script-url': 'error'
    },
    overrides: [
        {
            files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            },
            rules: {
                'node/no-unpublished-require': 'off'
            }
        },
        {
            files: ['scripts/**/*.js'],
            rules: {
                'node/no-unpublished-require': 'off',
                'node/shebang': 'off'
            }
        }
    ]
}; 