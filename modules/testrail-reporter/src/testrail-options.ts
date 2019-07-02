export interface Step {
  content: string
  expected?: string
}

export interface Case {
  id: number
  title: string
  section_id?: number
  template_id?: number
  type_id?: number
  priority_id?: number
  milestone_id?: number
  refs?: string
  created_by?: number
  created_on?: number
  updated_by?: number
  updated_on?: number
  estimate?: string
  estimate_forecast?: string
  suite_id?: number
  custom_preconds?: string
  custom_steps?: string
  custom_expected?: string
  custom_steps_separated?: Step[]
  custom_mission?: string
  custom_goals?: string
}

export interface Suite {
  id: number
  name: string
  description: string | null
  project_id: number
  is_master: boolean
  is_baseline: boolean
  is_completed: boolean
  completed_on: null
  url: string
}

export interface Section {
  depth: number
  display_order: number
  id: number
  name: string
  parent_id: number | null
  suite_id: number
}
export interface GetCasesOptions {
  suiteId: number
  sectionId: number
}

export interface GetSectionOptions {
  suiteId: number
}

export interface AddSectionBody {
  name: string
  suite_id: number
  parent_id?: number
  description?: string
}

export interface AddSuiteBody {
  name: string
  description?: string
}

export interface AddCaseBody {
  title: string //	The title of the test case (required)
  template_id?: number //	The ID of the template (field layout) (requires TestRail 5.2 or later)
  type_id?: number //	The ID of the case type
  priority_id?: number //	The ID of the case priority
  estimate?: string //	The estimate, e.g. "30s" or "1m 45s"
  milestone_id?: number //	The ID of the milestone to link to the test case
  refs?: string //	A comma-separated list of references/requirements
  custom_steps_separated: Step[]
}

export interface AddRunBody {
  suite_id: number //	The ID of the test suite for the test run (optional if the project is operating in single suite mode, required otherwise)
  name: string //	The name of the test run
  description?: string //	The description of the test run
  milestone_id?: boolean //	The ID of the milestone to link to the test run
  assignedto_id?: boolean //	The ID of the user the test run should be assigned to
  include_all?: boolean //	True for including all test cases of the test suite and false for a custom case selection (default: true)
  case_ids?: number[] //	An array of case IDs for the custom case selection
}

export enum ResultStatus {
  Passed = 1,
  Blocked = 2,
  Untested = 3,
  Retest = 4,
  Failed = 5,
}

export interface StepResult {
  status_id: ResultStatus
  content: string
  expected?: string
  actual?: string
}

export interface Result {
  case_id: number
  status_id: ResultStatus
  custom_step_results: StepResult[]
  comment?: string
  defects?: string
  elapsed?: string
  version?: string
}

export interface Run {
  id: number
  name: string
  assignedto_id?: number | null
  blocked_count?: number
  completed_on?: null
  config?: string
  config_ids?: number[]
  created_by?: number
  created_on?: number
  description?: string | null
  failed_count?: number
  include_all?: boolean
  is_completed?: boolean
  milestone_id?: number
  passed_count?: number
  plan_id?: number
  project_id?: number
  retest_count?: number
  suite_id?: number
  untested_count?: number
  url?: string
}

export interface AddResultsForCasesBody {
  results: Result[]
}
