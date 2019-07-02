/* eslint-disable no-param-reassign */

import * as childProcess from 'child_process'
import { Runner, Suite, Test } from 'mocha'
import * as path from 'path'
import stripAnsi from 'strip-ansi'
import { Message, ReporterOptions, TestRunData, TestSection, TestSuite, TestCase } from './types'

function formatError(err: Error) {
  return stripAnsi(err.toString())
}

function createSuite(state: TestRunData, name: string): TestSuite {
  const suite = state.suites.find(s => s.name === name)

  if (!suite) {
    const newSuite = { name, sections: [] }
    state.suites.push(newSuite)

    return newSuite
  }

  return suite
}

function createSectionInSuite(suite: TestSuite, name: string): TestSection {
  const section = suite.sections.find(s => s.name === name)

  if (!section) {
    const newSection = { name, sections: [], cases: [] }
    suite.sections.push(newSection)

    return newSection
  }

  return section
}

function createSectionInSection(parentSection: TestSection, name: string): TestSection {
  const section = parentSection.sections.find(s => s.name === name)

  if (!section) {
    const newSection = { name, sections: [], cases: [] }
    parentSection.sections.push(newSection)

    return newSection
  }

  return section
}

function createCase(section: TestSection, title: string): TestCase {
  const testcase = section.cases.find(s => s.title === title)

  if (!testcase) {
    const newTestcase = { title, steps: [] }
    section.cases.push(newTestcase)

    return newTestcase
  }

  return testcase
}

function getSuiteType(suite: Suite): 'testcase' | undefined {
  const type = (suite as any).testRailType

  return type === 'testcase' ? type : undefined
}

function getTestType(test: Test): 'step' | 'expected' | undefined {
  const type = (test as any).testRailType

  return ['step', 'expected'].includes(type) ? type : undefined
}

export class MochaTestRailReporter {
  public constructor(runner: Runner, options: { reporterOptions: ReporterOptions }) {
    const state: TestRunData = {
      suites: [],
    }

    const reporterOptions: Required<ReporterOptions> = {
      casePrefix: 'Autotest: ',
      mode: 'do_nothing',
      ...options.reporterOptions,
    }

    if (reporterOptions.mode === 'do_nothing') {
      return
    }

    runner.on('suite', suite => {
      if (
        !suite.file ||
        suite.root ||
        !suite.parent ||
        !suite.title ||
        suite.pending ||
        getSuiteType(suite) !== 'testcase'
      ) {
        return
      }

      if (reporterOptions.mode === 'create_cases') {
        suite.pending = true
      }

      const filePathInfo = path.parse(suite.file.replace(options.reporterOptions.testsRootDir, ''))
      const dirs = filePathInfo.dir.split(path.sep).filter(Boolean)
      const [suiteName, ...sectionNames] = [...dirs, filePathInfo.name.split('.')[0]]

      if (sectionNames.length === 0) {
        throw new Error('Section is required')
      }

      const trSuite = createSuite(state, suiteName)
      const topSection = createSectionInSuite(trSuite, sectionNames[0])

      const finalSection = sectionNames
        .slice(1)
        .reduce((parentSection, name) => createSectionInSection(parentSection, name), topSection)

      const testcase = createCase(finalSection, suite.title)
      ;(suite as any).testRailCase = testcase
    })

    runner.on('pass', test => {
      const type = getTestType(test)
      const testcase: TestCase | undefined = test.parent && (test.parent as any).testRailCase

      if (!type || !testcase) {
        return
      }

      if (type === 'step') {
        testcase.steps.push({ status: 'passed', content: test.title })
      } else {
        const prevStep = testcase.steps[testcase.steps.length - 1]
        if (!prevStep) {
          throw new Error('expected() should be after step() or another expected()')
        }

        prevStep.expected = [prevStep.expected, test.title].filter(Boolean).join('\n\n')
        prevStep.actual = prevStep.expected
      }
    })

    runner.on('fail', (test, err) => {
      const type = getTestType(test)
      const testcase: TestCase | undefined = test.parent && (test.parent as any).testRailCase

      if (!type || !testcase) {
        return
      }

      if (type === 'step') {
        testcase.steps.push({ status: 'failed', content: test.title, actual: formatError(err) })
      } else {
        const prevStep = testcase.steps[testcase.steps.length - 1]
        if (!prevStep) {
          throw new Error('expected() should be after step() or another expected()')
        }

        prevStep.status = 'failed'
        prevStep.expected = [prevStep.expected, test.title].filter(Boolean).join('\n\n')
        prevStep.actual = formatError(err)
      }
    })

    // end event is called twice (fixed only in mocha@6)
    // https://github.com/mochajs/mocha/pull/3715
    let ended = false
    runner.on('end', () => {
      if (ended) return
      ended = true

      const child = childProcess.fork(`${__dirname}/send-report.js`)
      const message: Message = {
        type: 'SEND_REPORT',
        completedTestsInfo: state,
        reporterOptions,
      }
      child.send(message)
    })
  }
}
