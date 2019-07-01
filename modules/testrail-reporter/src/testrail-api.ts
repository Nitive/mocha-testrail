/* eslint-disable no-console */
import axios, { AxiosInstance } from 'axios'
import * as TestRail from './testrail-options'

export interface TestRailApiOptions {
  domain: string
  username: string
  apiToken: string
  projectId: number
}

interface Options extends TestRailApiOptions {
  baseAxiosClient?: AxiosInstance
}

export class TestRailApi {
  private client: AxiosInstance

  private options: Options

  public constructor(options: Options) {
    this.options = options
    this.client = process.env.TESTRAIL_REPORTER_TEST
      ? axios.create({
          baseURL: `http://localhost:${process.env.TESTRAIL_REPORTER_MOCK_SERVER_PORT}/`,
        })
      : axios.create({
          baseURL: `https://${options.domain}/index.php?/api`,
          headers: { 'Content-Type': 'application/json' },
          auth: {
            username: options.username,
            password: options.apiToken,
          },
        })
  }

  public getCases({ suiteId, sectionId }: TestRail.GetCasesOptions): Promise<TestRail.Case[]> {
    return this.client
      .get(`/v2/get_cases/${this.options.projectId}&suite_id=${suiteId}&section_id=${sectionId}`)
      .then(res => res.data)
  }

  public addCase = ({
    sectionId,
    ...body
  }: { sectionId: number } & TestRail.AddCaseBody): Promise<TestRail.Case> => {
    return this.client.post(`/v2/add_case/${sectionId}`, body).then(res => res.data)
  }

  public getSections = ({ suiteId }: TestRail.GetSectionOptions): Promise<TestRail.Section[]> => {
    return this.client
      .get(`/v2/get_sections/${this.options.projectId}&suite_id=${suiteId}`)
      .then(res => res.data)
  }

  public addSection = (body: TestRail.AddSectionBody): Promise<TestRail.Section> => {
    return this.client.post(`/v2/add_section/${this.options.projectId}`, body).then(res => res.data)
  }

  public getSuites = (): Promise<TestRail.Suite[]> => {
    return this.client.get(`/v2/get_suites/${this.options.projectId}`).then(res => res.data)
  }

  public addSuite = (body: TestRail.AddSuiteBody): Promise<TestRail.Suite> => {
    return this.client.post(`/v2/add_suite/${this.options.projectId}`, body).then(res => res.data)
  }

  public addRun = (body: TestRail.AddRunBody): Promise<TestRail.Run> => {
    return this.client.post(`/v2/add_run/${this.options.projectId}`, body).then(res => res.data)
  }

  public addResultsForCases = ({
    runId,
    ...body
  }: TestRail.AddResultsForCasesBody & { runId: number }) => {
    return this.client.post(`/v2/add_results_for_cases/${runId}`, body).then(res => res.data)
  }
}
