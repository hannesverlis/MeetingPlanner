module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'logic.js',
    'app.js'
  ],
  coverageReporters: ['text', 'text-summary'],
  coverageDirectory: 'coverage'
};
