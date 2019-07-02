/* eslint-disable global-require */
/* eslint-disable func-names */
const Test = require('mocha/lib/test')

/**
 * BDD-style interface:
 *
 *      describe('Array', function() {
 *        describe('#indexOf()', function() {
 *          it('should return -1 when not present', function() {
 *            // ...
 *          });
 *
 *          it('should return the index when present', function() {
 *            // ...
 *          });
 *        });
 *      });
 *
 * @param {Suite} suite Root suite.
 */
module.exports = function bddInterface(suite) {
  const suites = [suite]

  suite.on('pre-require', function(context, file, mocha) {
    const common = require('mocha/lib/interfaces/common')(suites, context, mocha)

    context.before = common.before
    context.after = common.after
    context.beforeEach = common.beforeEach
    context.afterEach = common.afterEach
    context.run = mocha.options.delay && common.runWithSuite(suite)

    context.testcase = function(title, fn) {
      return common.suite.create({
        title,
        file,
        fn,
      })
    }

    context.testcase.skip = function(title, fn) {
      return common.suite.skip({ title, file, fn })
    }

    context.testcase.only = function(title, fn) {
      return common.suite.only({ title, file, fn })
    }

    context.step = function(title, fn) {
      const currentSuite = suites[0]
      if (currentSuite.isPending()) {
        fn = null
      }
      const test = new Test(title, fn)
      test.file = file
      currentSuite.addTest(test)
      return test
    }

    context.step.only = function(title, fn) {
      return common.test.only(mocha, context.step(title, fn))
    }

    context.xit = context.step.skip = function(title) {
      return context.step(title)
    }

    context.step.retries = function(n) {
      context.retries(n)
    }

    context.expected = function(title, fn) {
      const currentSuite = suites[0]
      if (currentSuite.isPending()) {
        fn = null
      }
      const test = new Test(title, fn)
      test.file = file
      currentSuite.addTest(test)
      return test
    }

    context.expected.only = function(title, fn) {
      return common.test.only(mocha, context.expected(title, fn))
    }

    context.xit = context.expected.skip = function(title) {
      return context.expected(title)
    }

    context.expected.retries = function(n) {
      context.retries(n)
    }
  })
}
