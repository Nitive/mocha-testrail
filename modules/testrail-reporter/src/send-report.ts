import Axios from 'axios'
import { TestRailApi } from './testrail-api'
import * as TestRail from './testrail-options'
import { Message, ReporterOptions, TestSection, TestSuite, TestCase } from './types'

interface CaseWithResults {
  case: TestRail.Case
  result: TestCase['steps']
}

interface CreateSectionsResult {
  section: TestRail.Section
  sections: CreateSectionsResult[]
  cases: CaseWithResults[]
}

interface CreateSuitesResult {
  suite: TestRail.Suite
  sections: CreateSectionsResult[]
}

function runSequentialy<T, U>(arr: T[], fn: (x: T) => Promise<U>): Promise<U[]> {
  return Promise.all(
    arr.reduce((promises, x) => {
      const prevPromise = promises[promises.length - 1] || Promise.resolve()
      return [...promises, prevPromise.then(() => fn(x))]
    }, []),
  )
}

function createHelpers(api: TestRailApi, reporterOptions: Required<ReporterOptions>) {
  async function createCases(cases: TestCase[], section: TestRail.Section) {
    const currentCases = await api.getCases({ suiteId: section.suite_id, sectionId: section.id })
    const getCase = async ({ title, steps }: TestCase) => {
      const testcase = currentCases.find(c => c.title === title)

      return (
        testcase ||
        api.addCase({
          title,
          sectionId: section.id,
          template_id: 2,
          custom_steps_separated: steps.map(step => ({
            content: step.content,
            expected: step.expected,
          })),
        })
      )
    }

    return runSequentialy(cases, async testcase => {
      return {
        case: await getCase({
          ...testcase,
          title: reporterOptions.casePrefix + testcase.title,
        }),
        result: testcase.steps,
      }
    })
  }

  async function createSections(
    sections: TestSection[],
    suiteId: number,
    parentId?: number,
  ): Promise<CreateSectionsResult[]> {
    const currentSections = await api.getSections({ suiteId })
    const getSection = async (name: string) => {
      const section = currentSections.find(
        s => s.name === name && s.parent_id === (parentId || null),
      )

      return section || api.addSection({ name, suite_id: suiteId, parent_id: parentId })
    }

    return runSequentialy(sections, async section => {
      const apiSection = await getSection(section.name)

      return {
        section: apiSection,
        sections: await createSections(section.sections, suiteId, apiSection.id),
        cases: await createCases(section.cases, apiSection),
      }
    })
  }

  async function createSuites(suites: TestSuite[]): Promise<CreateSuitesResult[]> {
    const currentSuites = await api.getSuites()
    const getSuite = async (name: string) => {
      const suite = currentSuites.find(s => s.name === name)

      return suite || api.addSuite({ name })
    }

    return runSequentialy(suites, async suite => {
      const apiSuite = await getSuite(suite.name)

      return {
        suite: apiSuite,
        sections: await createSections(suite.sections, apiSuite.id),
      }
    })
  }

  function getCasesFromSection(section: CreateSectionsResult): CaseWithResults[] {
    const cases: CaseWithResults[] = []
    if (section.cases.length) {
      cases.push(...section.cases)
    }

    if (section.sections.length) {
      cases.push(...section.sections.map(getCasesFromSection).reduce((acc, x) => acc.concat(x), []))
    }

    return cases
  }

  function getCases(results: CreateSuitesResult[]): CaseWithResults[] {
    return results
      .map(result => result.sections)
      .reduce((acc, x) => acc.concat(x), [])
      .map(getCasesFromSection)
      .reduce((acc, x) => acc.concat(x), [])
  }

  async function publishTestResults(results: CreateSuitesResult[]) {
    await runSequentialy(results, async ({ suite }) => {
      const run = await api.addRun({
        suite_id: suite.id,
        name: 'Test run',
        include_all: true,
      })

      const cases = getCases(results)

      await api.addResultsForCases({
        runId: run.id,
        results: cases.map(testcase => ({
          case_id: testcase.case.id,
          status_id: testcase.result.every(r => r.status === 'passed')
            ? TestRail.ResultStatus.Passed
            : TestRail.ResultStatus.Failed,
          custom_step_results: testcase.result.map(step => ({
            status_id:
              step.status === 'passed'
                ? TestRail.ResultStatus.Passed
                : TestRail.ResultStatus.Failed,
            content: step.content,
          })),
        })),
      })
    })
  }

  return { createSuites, publishTestResults }
}

async function sendCompleteEvent() {
  await Axios.post(`http://localhost:${process.env.TESTRAIL_REPORTER_MOCK_SERVER_PORT}/complete`)
}

async function main(message: Message) {
  if (message.type === 'SEND_REPORT') {
    const api = new TestRailApi(message.reporterOptions)
    const { completedTestsInfo } = message
    const { createSuites, publishTestResults } = createHelpers(api, message.reporterOptions)

    const results = await createSuites(completedTestsInfo.suites)
    await publishTestResults(results)

    if (process.env.TESTRAIL_REPORTER_TEST) {
      await sendCompleteEvent()
    }

    return
  }

  throw new Error(`Unexpected message ${JSON.stringify(message, null, 2)}`)
}

process.on('message', async (message: Message) => {
  try {
    await main(message)
    process.exit(0)
  } catch (err) {
    console.error(err) // eslint-disable-line no-console
    process.exit(1)
  }
})
