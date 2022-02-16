require('dotenv').config()
import { getTestFiles } from "./utils"
import { beforeConnectToProviders, beforeBuildEncodedCalls } from "./beforeTesting";
import { TestFile } from "./interfaces";
import { describersBuilder } from "./descriptor";

const run = async () => {
  let testsPath = process.env.TESTS_PATH
  let testsConfig: TestFile[] = getTestFiles(testsPath)
  let testConfig: TestFile

  console.log(testsPath)

  for (testConfig of testsConfig) {
    const { yaml, dir } = testConfig
    beforeConnectToProviders(testConfig)
    beforeBuildEncodedCalls(yaml.settings.decodedCalls)

    for (const test of yaml.tests) {
      describersBuilder(test)
    }
  }
}

run()