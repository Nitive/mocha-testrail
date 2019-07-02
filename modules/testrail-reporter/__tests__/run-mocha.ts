import * as Mocha from 'mocha'
import * as path from 'path'
import { MochaTestRailReporter } from '../src/reporter'
import { RunMode, ReporterOptions } from '../src/types'

const fixturesDir = path.join(__dirname, '../../__tests__/__fixtures__')
const fixture = (name: string) => path.join(fixturesDir, `${name}.js`)

process.on('message', (message: { type: 'RUN_MOCHA'; testFileNames: string[]; mode: RunMode }) => {
  if (message.type === 'RUN_MOCHA') {
    const mocha = new Mocha()

    mocha.ui('@nitive/mocha-testrail-ui')

    message.testFileNames.forEach(file => {
      mocha.addFile(fixture(file))
    })

    const options: ReporterOptions = {
      mode: message.mode,
      testsRootDir: fixturesDir,
      domain: 'company.testrail.io',
      username: 'email@email.com',
      apiToken: '',
      projectId: 1,
    }

    mocha.reporter(MochaTestRailReporter as any, options)

    mocha.allowUncaught()

    mocha.run(failures => {
      if (process.send) {
        process.send({ type: 'MOCHA_RUN_COMPLETE', failures })
      }
      process.exit(failures)
    })
  }
})
