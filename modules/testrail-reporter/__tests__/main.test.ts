import * as path from 'path'
import * as childProcess from 'child_process'
import { DeepPartial } from 'ts-essentials'
import Axios from 'axios'
import { uniqBy, pick } from 'lodash'
import { ServerState, createMockServer } from './server'
import * as TestRail from '../src/testrail-options'

function checkAnyState(state: ServerState) {
  expect(Object.keys(state)).toEqual(['suites', 'sections', 'cases', 'runs'])
  expect(state.suites).toHaveLength(uniqBy(state.suites, 'name').length)
  expect(state.sections).toHaveLength(
    uniqBy(state.sections, section => section.name + section.parent_id).length,
  )
  expect(state.cases).toHaveLength(
    uniqBy(state.cases, testcase => testcase.title + testcase.section_id).length,
  )
}

async function runTestFiles(
  testFileNames: string[],
  initialState?: ServerState,
): Promise<ServerState> {
  const serverState = await new Promise<ServerState>((resolve, reject) => {
    const mockExpressServer = createMockServer(initialState)
    const port = process.env.TESTRAIL_REPORTER_MOCK_SERVER_PORT

    const httpServer = mockExpressServer.listen(port, () => {
      const child = childProcess.fork(path.join(__dirname, 'run-mocha.js'))
      const destroy = (err: Error) => {
        httpServer.close()
        reject(err)
      }

      child.send({ type: 'RUN_MOCHA', testFileNames })
      child.on('message', message => {
        if (message.type === 'MOCHA_RUN_COMPLETE') {
          Axios.get(`http://localhost:${port}/server-state`)
            .then(res => {
              httpServer.close()
              resolve(res.data)
            })
            .catch(destroy)
          return
        }
        destroy(new Error(`Unexpected message ${JSON.stringify(message, null, 2)}`))
      })

      child.on('error', destroy)
    })
  })

  checkAnyState(serverState)

  return serverState
}

function normalizeState(state: ServerState): DeepPartial<ServerState> {
  return {
    suites: state.suites.map(s => pick(s, ['id', 'name'])),
    sections: state.sections.map(s => pick(s, ['id', 'name', 'suite_id', 'parent_id'])),
    cases: state.cases.map(c => pick(c, ['id', 'title', 'section_id', 'suite_id'])),
  }
}

function getSteps(state: ServerState): Partial<TestRail.Case>[] {
  return state.cases.map(testcase => {
    return pick(testcase, ['title', 'custom_steps_separated'])
  })
}

function getRuns(state: ServerState): Partial<TestRail.Run & { results: TestRail.Result[] }>[] {
  return state.runs.map(r => pick(r, ['id', 'name', 'results']))
}

describe('testrail-reporter', () => {
  it('should create suite, section and case', async () => {
    const serverState = await runTestFiles(['Suite/Section'])

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [{ id: 1, name: 'Section', suite_id: 1, parent_id: null }],
      cases: [{ id: 1, title: 'Autotest: Case', section_id: 1, suite_id: 1 }],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should create suite, section and case with testcase.only', async () => {
    const serverState = await runTestFiles(['Suite/Section with only'])

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [{ id: 1, name: 'Section with only', suite_id: 1, parent_id: null }],
      cases: [{ id: 1, title: 'Autotest: Case', section_id: 1, suite_id: 1 }],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should not create suite, section and case with testcase.skip', async () => {
    const serverState = await runTestFiles(['Suite/Section with skip'])

    const expectedState: DeepPartial<ServerState> = {
      suites: [],
      sections: [],
      cases: [],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should not create duplicates', async () => {
    const serverState = await runTestFiles(['Suite/Two cases'])

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [{ id: 1, name: 'Two cases', suite_id: 1, parent_id: null }],
      cases: [
        { id: 1, title: 'Autotest: Case 1', section_id: 1, suite_id: 1 },
        { id: 2, title: 'Autotest: Case 2', section_id: 1, suite_id: 1 },
      ],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should not create duplicates after second run', async () => {
    const serverState = await runTestFiles(['Suite/Two cases'])
    const serverState2 = await runTestFiles(['Suite/Two cases'], serverState)

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [{ id: 1, name: 'Two cases', suite_id: 1, parent_id: null }],
      cases: [
        { id: 1, title: 'Autotest: Case 1', section_id: 1, suite_id: 1 },
        { id: 2, title: 'Autotest: Case 2', section_id: 1, suite_id: 1 },
      ],
    }
    expect(normalizeState(serverState2)).toEqual(expectedState)
  })

  it('should not create duplicates after second run on two files', async () => {
    const files = ['Suite/Two files (1)', 'Suite/Two files (2)']
    const serverState = await runTestFiles(files)

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [
        { id: 1, name: 'Two files (1)', suite_id: 1, parent_id: null },
        { id: 2, name: 'Two files (2)', suite_id: 1, parent_id: null },
      ],
      cases: [
        { id: 1, title: 'Autotest: Case 1', section_id: 1, suite_id: 1 },
        { id: 2, title: 'Autotest: Case 2', section_id: 2, suite_id: 1 },
      ],
    }

    expect(normalizeState(serverState)).toEqual(expectedState)

    const serverState2 = await runTestFiles(files, serverState)

    expect(normalizeState(serverState2)).toEqual(expectedState)
  })

  it('should not create duplicated cases', async () => {
    const serverState = await runTestFiles(['Suite/Duplicated cases'])

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [{ id: 1, name: 'Duplicated cases', suite_id: 1, parent_id: null }],
      cases: [{ id: 1, title: 'Autotest: Case', section_id: 1, suite_id: 1 }],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should create nested sections', async () => {
    const serverState = await runTestFiles([
      'Suite/Nested Section/Section',
      'Suite/Nested Section/Nested Section 2/Section',
    ])

    const expectedState: DeepPartial<ServerState> = {
      suites: [{ id: 1, name: 'Suite' }],
      sections: [
        { id: 1, name: 'Nested Section', suite_id: 1, parent_id: null },
        { id: 2, name: 'Section', suite_id: 1, parent_id: 1 },
        { id: 3, name: 'Nested Section 2', suite_id: 1, parent_id: 1 },
        { id: 4, name: 'Section', suite_id: 1, parent_id: 3 },
      ],
      cases: [
        { id: 1, title: 'Autotest: Case', section_id: 2, suite_id: 1 },
        { id: 2, title: 'Autotest: Case', section_id: 4, suite_id: 1 },
      ],
    }
    expect(normalizeState(serverState)).toEqual(expectedState)
  })

  it('should create steps', async () => {
    const serverState = await runTestFiles(['Suite/Section'])

    const expectedState: DeepPartial<TestRail.Case[]> = [
      {
        title: 'Autotest: Case',
        custom_steps_separated: [{ content: 'Step' }],
      },
    ]
    expect(getSteps(serverState)).toEqual(expectedState)
  })

  it('should create run with results', async () => {
    const serverState = await runTestFiles(['Suite/Section'])

    const expectedState: DeepPartial<(TestRail.Run & { results: TestRail.Result[] })[]> = [
      {
        id: 1,
        name: 'Test run',
        results: [
          {
            case_id: 1,
            status_id: TestRail.ResultStatus.Passed,
            custom_step_results: [
              {
                status_id: TestRail.ResultStatus.Passed,
                content: 'Step',
              },
            ],
          },
        ],
      },
    ]
    expect(getRuns(serverState)).toEqual(expectedState)
  })

  it.skip('should create expected state in step', async () => {
    const serverState = await runTestFiles(['Suite/Expected'])

    const expectedState: DeepPartial<TestRail.Case[]> = [
      {
        title: '',
        custom_steps_separated: [
          {
            content: 'Step',
            expected: 'Expected',
          },
        ],
      },
    ]
    expect(getSteps(serverState)).toEqual(expectedState)
  })
})
