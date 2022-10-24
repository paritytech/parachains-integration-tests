require('dotenv').config();
import { getTestFiles } from './utils';
import {
  beforeConnectToProviders,
  beforeBuildDecodedCalls,
  beforeAddConsoleGroups,
} from './before';
import { TestFile } from './interfaces';
import { describersBuilder } from './descriptor';

const run = async () => {
  let testsPath = process.env.TESTS_PATH;
  let testsConfig: TestFile[] = getTestFiles(testsPath);
  let testConfig: TestFile;

  for (testConfig of testsConfig) {
    const { yaml, name } = testConfig;

    describe(`\n📂 ${name}`, async function () {
      beforeAddConsoleGroups(2);
      beforeConnectToProviders(testConfig);
      beforeBuildDecodedCalls(yaml.settings.decodedCalls);

      for (const test of yaml.tests) {
        describersBuilder(test);
      }
    });
  }
};

run();
