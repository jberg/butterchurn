export default {
  testEnvironment: 'node',

  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],

  setupFilesAfterEnv: ['<rootDir>/test/visual/setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**'
  ],

  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }]
  },

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
