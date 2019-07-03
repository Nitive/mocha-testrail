import * as mocha from 'mocha'
import { TestRailApiOptions } from './testrail-api'

export interface TestSuite {
  name: string
  sections: TestSection[]
}

export interface TestSection {
  name: string
  sections: TestSection[]
  cases: TestCase[]
}

export interface TestStep {
  status: 'passed' | 'failed'
  content: string
  expected?: string
  actual?: string
}

export interface TestCase {
  title: string
  steps: TestStep[]
}

export interface TestRunData {
  suites: TestSuite[]
}

export interface Message {
  type: 'SEND_REPORT'
  completedTestsInfo: TestRunData
  reporterOptions: Required<ReporterOptions>
}

export type RunMode =
  | 'do_nothing' /** Do nothing */
  | 'create_cases' /** Create test cases and suites and sections for them. All tests will be skiped */
  | 'publish_ran_tests' /** Create run with ran cases and publish results */
  | 'publish_run' /** Take run from TestRail and run cases from it */

interface ReporterConstructor {
  new (runner: mocha.Runner, options: mocha.MochaOptions): any
}

export interface ReporterOptions extends TestRailApiOptions {
  testsRootDir: string
  casePrefix?: string
  mode?: RunMode
  additionalReporter?: keyof typeof mocha.reporters | ReporterConstructor
  additionalReporterOptions?: any
}
