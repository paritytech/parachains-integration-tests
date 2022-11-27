const chai = require('chai');
var should = require('chai').should();
import { Assert, Custom, AssertOrCustom } from './interfaces';
import { customBuilder } from './custom';
import { addConsoleGroupEnd, parseArgs } from './utils';
import { REGISTERED_ASSERTIONS } from './constants';

const customAssert = async (context, assert: Custom, path: string) => {
  assert.path = path;
  try {
    await customBuilder(context, assert);
  } catch (e) {
    addConsoleGroupEnd(2);
    throw e;
  }
  await customBuilder(context, assert);
};

const equalAssert = async (context, assert: Assert) => {
  const { args } = assert;

  let parsedArgs = parseArgs(context, args);

  chai.assert.deepEqual(parsedArgs[0], parsedArgs[1]);
};

const isRegisteredAssert = (key) => {
  return REGISTERED_ASSERTIONS.includes(key);
};

const runAssert = async (context, key: string, assert: AssertOrCustom) => {
  let custom = assert as Custom;

  if (key === 'equal') {
    await equalAssert(context, assert);
  } else if (key === 'custom') {
    await customAssert(context, custom, custom.path);
  } else {
    let extension = process.env.ENV === 'prod' ? 'js' : 'ts';
    let path: string = `${__dirname}/asserts/${key}.${extension}`;
    await customAssert(context, custom, path);
  }
};

export const assertsBuilder = async (
  context,
  asserts: { [key: string]: AssertOrCustom }
) => {
  for (let key of Object.keys(asserts)) {
    if (isRegisteredAssert(key)) {
      await runAssert(context, key, asserts[key]);
    } else {
      console.log(`\n⚠️  the assert type '${key}' is not implemented`);
      process.exit(1);
    }
  }
};
