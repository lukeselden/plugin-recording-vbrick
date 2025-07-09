import love from 'eslint-config-love';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * @type {import("@typescript-eslint/utils").TSESLint.FlatConfig.ConfigArray}
 */
const configuration = [
    eslintConfigPrettier,
    love,
    {
        ignores: ['**/dist'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',

            parserOptions: {
                project: ['./tsconfig.json'],
            },
        },
        files: ['./src/**/*.ts', './src-helper/**/*.ts'],
        rules: {
            "promise/avoid-new": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "warn",
            "@typescript-eslint/prefer-destructuring": "warn",
            "@typescript-eslint/no-magic-numbers": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "arrow-body-style": "warn",
            "no-console": "off",
            "@typescript-eslint/no-unsafe-type-assertion": "off"
        }
    }
];
export default configuration;