require('dotenv').config()
import { addConsoleGroups, getTestFiles } from "./utils"
import { beforeConnectToProviders, beforeBuildEncodedCalls } from "./before";
import { TestFile } from "./interfaces";
import { describersBuilder } from "./descriptor";

const run = async () => {
  let testsPath = process.env.TESTS_PATH
  let testsConfig: TestFile[] = getTestFiles(testsPath)
  let testConfig: TestFile

  for (testConfig of testsConfig) {
    const { yaml, name } = testConfig

    describe(`\n📂 ${name}`, async function () {
      addConsoleGroups(2)    
      beforeConnectToProviders(testConfig)
      if (yaml.settings.decodedCalls) {
        beforeBuildEncodedCalls(yaml.settings.decodedCalls)
      }
      
      for (const test of yaml.tests) {
        describersBuilder(test)
      }
    })
  }
}

run()