import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as TestRail from '../src/testrail-options'

export interface ServerState {
  suites: TestRail.Suite[]
  sections: TestRail.Section[]
  cases: TestRail.Case[]
  runs: (TestRail.Run & { results: TestRail.Result[] })[]
}

function incrementId<T extends { id: number }>(objects: T[]) {
  if (!objects.length) {
    return 1
  }

  return Math.max(...objects.map(obj => obj.id)) + 1
}

export function createMockServer(initialState?: ServerState) {
  const state: ServerState = initialState || {
    suites: [],
    sections: [],
    cases: [],
    runs: [],
  }

  const server = express()

  let complete: () => void
  const completePromise = new Promise(resolve => {
    complete = resolve
  })

  server.use(bodyParser.json())

  server
    .get('/v2/get_suites/:projectId', (_req, res) => {
      res.send(state.suites)
    })
    .post('/v2/add_suite/:projectId', (req, res) => {
      const id = incrementId(state.suites)
      const suite = {
        id,
        name: req.body.name,
        description: null,
        project_id: Number(req.params.projectId),
        is_master: false,
        is_baseline: false,
        is_completed: false,
        completed_on: null,
        url: `https://csssrtest.testrail.io/index.php?/suites/view/${id}`,
      }
      state.suites.push(suite)

      res.send(suite)
    })

    .get('/v2/get_sections/:projectId&suite_id=:suiteId', (req, res) => {
      const suiteId = Number(req.params.suiteId)
      const sections = state.sections.filter(section => section.suite_id === suiteId)
      res.send(sections)
    })
    .post('/v2/add_section/:projectId', (req, res) => {
      const id = incrementId(state.sections)
      const data: TestRail.AddSectionBody = req.body

      const section = {
        name: data.name,
        id,
        suite_id: data.suite_id,
        description: null,
        parent_id: data.parent_id || null,
        display_order: 1,
        depth: 0,
      }
      state.sections.push(section)

      res.send(section)
    })

    .get('/v2/get_cases/:projectId&suite_id=:suiteId&section_id=:sectionId', (req, res) => {
      const suiteId = Number(req.params.suiteId)
      const sectionId = Number(req.params.sectionId)

      const cases = state.cases
        .filter(testcase => testcase.suite_id === suiteId)
        .filter(testcase => testcase.section_id === sectionId)
      res.send(cases)
    })

    .post('/v2/add_case/:sectionId', (req, res) => {
      const sectionId = Number(req.params.sectionId)
      const id = incrementId(state.cases)
      const section = state.sections.find(s => s.id === sectionId)

      if (!section) {
        res.status(400).send(`Section with id ${sectionId} is not found`)
        return
      }

      const data: TestRail.AddCaseBody = req.body

      const testcase = {
        id,
        title: data.title,
        section_id: sectionId,
        suite_id: section.suite_id,
        custom_steps_separated: data.custom_steps_separated,
      }

      state.cases.push(testcase)

      res.send(testcase)
    })

    .post('/v2/add_run/:projectId', (req, res) => {
      const data: TestRail.AddRunBody = req.body
      const run = {
        id: incrementId(state.runs),
        description: data.description,
        include_all: data.include_all,
        name: data.name,
        project_id: req.params.projectId,
        suite_id: data.suite_id,
        results: [],
      }

      state.runs.push(run)

      res.send(run)
    })

    .post('/v2/add_results_for_cases/:runId', (req, res) => {
      const runId = Number(req.params.runId)
      const data: TestRail.AddResultsForCasesBody = req.body

      const run = state.runs.find(r => r.id === runId)

      if (!run) {
        res.status(404).send(`Run with id ${runId} is not found`)
        return
      }

      run.results.push(...data.results)

      res.send(run.results)
    })

    .post('/complete', (_req, res) => {
      complete()
      res.send({ status: 'ok' })
    })

    .get('/server-state', (_req, res) => {
      completePromise
        .then(() => {
          res.send(state)
        })
        .catch(res.send)
    })

  return server
}
