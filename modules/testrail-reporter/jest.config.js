// istanbul ignore file

if (!process.env.TESTRAIL_REPORTER_TEST) {
  throw new Error(
    'TESTRAIL_REPORTER_TEST environment variable is required to run tests. ' +
      'You have probably ran `npx jest` instead of `make test`',
  )
}

module.exports = {
  verbose: true,
  testEnvironment: 'node',
  testMatch: ['**/*test.js'],
}
