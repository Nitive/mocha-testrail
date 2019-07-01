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

export interface ReporterOptions extends TestRailApiOptions {
  testsRootDir: string
  casePrefix?: string
}
