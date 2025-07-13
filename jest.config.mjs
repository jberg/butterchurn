export default {
  testEnvironment: 'node',


  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],

  setupFilesAfterEnv: ['<rootDir>/test/visual/setup.js'],

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/experiments/'
  ],

  testTimeout: 60000,

  verbose: true,

  injectGlobals: false,
  errorOnDeprecated: true,
};
