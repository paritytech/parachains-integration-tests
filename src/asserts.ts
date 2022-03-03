const chai = require('chai');
var should = require('chai').should()
import { Assert, Custom, AssertOrCustom } from './interfaces'
import { customBuilder } from './custom'
import { addConsoleGroupEnd, parseArgs } from './utils'

const customAssert = async (context, assert: Custom) => {
  try {
    await customBuilder(context, assert)
  } catch(e) {
    addConsoleGroupEnd(2)
    throw e
  }
  await customBuilder(context, assert)
}

const equalAssert = async (context, assert: Assert) => {
  const { args } = assert

  let parsedArgs = parseArgs(context, args)

  chai.assert.deepEqual(parsedArgs[0], parsedArgs[1])
}

const isRegisteredAssert = (key) => {
  return ['custom', 'equal', 'deepEqual'].includes(key)
}

const checkAssert = (key: string, assert: AssertOrCustom) => {
  
  const { args } = assert
  
  if (key === 'custom') {
    const { path } = assert as Custom

    if (!path) {
      console.log(`\n⛔ ERROR: 'path' should be present for the following assert: 'custom': ${JSON.stringify(assert)}`)
      process.exit(1)
    }
  } else {
    if (!Array.isArray(args)) {
      console.log(`\n⛔ ERROR: 'args' should be present and should be an array for the following assert: '${key}': ${JSON.stringify(assert)}`)
      process.exit(1)
    }
  }
}

const runAssert = async (context, key: string, assert: AssertOrCustom) => {
  checkAssert(key, assert)

  switch (key) {
    case 'custom':
      await customAssert(context, assert as Custom) 
      break
    case 'equal':
        await equalAssert(context, assert)
      break
    case 'deepEqual':
      // await deepEqualAssert(context, assert)
      break
  }

}

export const assertsBuilder = async (context, asserts: { [key: string]: AssertOrCustom }) => {
  for (let key of Object.keys(asserts)) {
    if (isRegisteredAssert(key)) {
      await runAssert(context, key, asserts[key])
    } else {
      console.log(`\n⚠️  the assert type '${key}' is not implemented`)
      process.exit(1)
    }
  }
}