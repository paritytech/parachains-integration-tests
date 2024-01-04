require('dotenv').config();
import { resolve, dirname } from 'path';
import { Describe, TestFile } from './interfaces';
import {
  beforeBuilder,
  beforeEachBuilder,
  afterBuilder,
  afterEachBuilder,
} from './hooks';
import { itsBuilder } from './it';
import { beforeAddConsoleGroups } from './before';
import { getTestFiles } from './utils';

export const describersBuilder = (description: Describe, testsPath: string) => {
  describe(`\n🏷️  ${description.name}`, async function () {
    beforeAddConsoleGroups(2);

    let timeout;

    if (process.env.TIMEOUT) {
      timeout = parseInt(process.env.TIMEOUT);
    }

    this.timeout(timeout);

    let hookBuilders = [
      { attribute: description.before, func: beforeBuilder },
      { attribute: description.beforeEach, func: beforeEachBuilder },
      { attribute: description.after, func: afterBuilder },
      { attribute: description.afterEach, func: afterEachBuilder },
    ];

    for (const builder of hookBuilders) {
      if (builder.attribute && Array.isArray(builder.attribute)) {
        for (const attr of builder.attribute) {
          builder.func(attr);
        }
      }
    }

    if (description.its && description.its.length > 0) {
      for (const it of description.its) {
        itsBuilder(it);
      }
    }

    if (description.path) {
      let absolutePath = resolve(testsPath, description.path);
      let testsConfig: TestFile[] = getTestFiles(absolutePath);
      let testConfig: TestFile;

      for (testConfig of testsConfig) {
        const { yaml } = testConfig;

        for (const test of yaml.tests) {
          describersBuilder(test, dirname(absolutePath));
        }
      }
    }

    if (description.describes && description.describes.length > 0) {
      for (const desc of description.describes) {
        describersBuilder(desc, testsPath);
      }
    }
  });
};
