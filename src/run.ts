require('dotenv').config()
import { getTestsConfig } from "./utils"
import { beforeConnectToProviders, beforeBuildEncodedCalls } from "./beforeTesting";
import { TestsConfig } from "./interfaces";
import { describersBuilder } from "./descriptor";

const run = async () => {
  let testsPath = process.env.TESTS_PATH
  let testsConfig: TestsConfig[] = getTestsConfig(testsPath)
  let testConfig: TestsConfig

  console.log(testsPath)

  for (testConfig of testsConfig) {
    beforeConnectToProviders(testConfig)
    beforeBuildEncodedCalls(testConfig.settings.decodedCalls)

    for (const test of testConfig.tests) {
      describersBuilder(test)
    }
  }
}

run()