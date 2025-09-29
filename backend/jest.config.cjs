module.exports = {
  preset: null,
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(sequelize|express-validator|multer|path|url|csrf|express-rate-limit|winston|bcrypt|file-url)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
