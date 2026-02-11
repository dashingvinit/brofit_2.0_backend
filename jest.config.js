module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
  ],
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/utils/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/utils/setup.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
