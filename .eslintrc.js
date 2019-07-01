module.exports = {
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
    'prettier/@typescript-eslint',
  ],
  env: {
    jest: true,
  },
  rules: {
    semi: ['error', 'never'],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'no-param-reassign': 'off',
    'no-multi-assign': 'off',
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',
  },
}
