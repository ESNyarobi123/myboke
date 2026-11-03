/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/common/**/*.ts',
    'src/modules/**/*.service.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: 'coverage',
};
