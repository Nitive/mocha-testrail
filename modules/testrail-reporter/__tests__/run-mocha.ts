import * as Mocha from 'mocha'
import * as path from 'path'
import { MochaTestRailReporter } from '../src/reporter'

const fixturesDir = path.join(__dirname, '../../__tests__/__fixtures__')
const fixture = (name: string) => path.join(fixturesDir, `${name}.js`)

process.on('message', (message: { type: 'RUN_MOCHA'; testFileNames: string[] }) => {
  if (message.type === 'RUN_MOCHA') {
    const mocha = new Mocha()

    mocha.ui('@nitive/mocha-testrail-ui')

    message.testFileNames.forEach(file => {
      mocha.addFile(fixture(file))
    })

    mocha.reporter(MochaTestRailReporter as any, {
      testsRootDir: fixturesDir,
      domain: 'csssrtest.testrail.io',
      username: 'samoilowmaxim@gmail.com',
      apiToken: process.env.TESTRAIL_TOKEN,
      projectId: 1,
      suitePrefix: 'Autotest: ',
    })

    mocha.run(failures => {
      if (process.send) {
        process.send({ type: 'MOCHA_RUN_COMPLETE' })
      }
      process.exit(failures)
    })
  }
})
