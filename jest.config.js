// jest.config.js
// This is the master Jest configuration file.

module.exports = {
  // The 'projects' option tells Jest to run both of the following configurations.
  projects: [
    './jest.config.api.js',
    './jest.config.ui.js',
  ],
  // We can also define global coverage settings here to avoid repetition.
  coverageDirectory: 'coverage',
  collectCoverage: true,
};
