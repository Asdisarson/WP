module.exports = {
    // Basic formatting
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    doubleQuote: false,
    
    // Indentation
    tabWidth: 4,
    useTabs: false,
    
    // Line length
    printWidth: 120,
    
    // Objects and arrays
    bracketSpacing: true,
    bracketSameLine: false,
    
    // Functions
    arrowParens: 'avoid',
    
    // Strings
    quoteProps: 'as-needed',
    
    // End of line
    endOfLine: 'lf',
    
    // File-specific overrides
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2,
                printWidth: 80
            }
        },
        {
            files: '*.md',
            options: {
                tabWidth: 2,
                printWidth: 80,
                proseWrap: 'always'
            }
        },
        {
            files: ['*.yml', '*.yaml'],
            options: {
                tabWidth: 2
            }
        }
    ]
}; 