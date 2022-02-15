import { Assert, Custom, AssertOrCustom } from './interfaces/test'
import { customBuilder } from './custom'

const customAssert = async (context, assert: Custom, indent: number) => {
  await customBuilder(context, assert, indent)
}

const isRegisteredAssert = (key) => {
  return ['custom', 'equal', 'deepEqual'].includes(key)
}

const checkAssert = (key: string, assert: AssertOrCustom) => {
  
  const { args } = assert

  if (!Array.isArray(args)) {
    console.log(`\n⚠️  "args" should be defined and should be an array for the following assert: "${key}": ${JSON.stringify(assert)}`)
    process.exit(1)
  }

  if (key === 'custom' && assert.type === 'custom') {
    const { path } = assert

    if (!path) {
      console.log(`\n⚠️  "path" should be defined for the following assert: "custom": ${JSON.stringify(assert)}`)
      process.exit(1)
    }
  }
}

const runAssert = async (context, key: string, assert: AssertOrCustom, indent: number) => {
  if (key === 'custom') {
    assert.type = 'custom'
  }

  checkAssert(key, assert)

  switch (key) {
    case 'custom':
      if (assert.type === 'custom') {
        await customAssert(context, assert, indent)
      }  
      break
    case 'equal':
      // await equalAssert(context, assert, indent)
      break
    case 'deepEqual':
      // await deepEqualAssert(context, assert, indent)
      break
  }

}

export const assertsBuilder = async (context, asserts: { [key: string]: AssertOrCustom }, indent: number) => {
  for (let key of Object.keys(asserts)) {
    if (isRegisteredAssert(key)) {
      await runAssert(context, key, asserts[key], indent)
    } else {
      console.log(`\n⚠️  the assert type "${key}" is not implemented`)
      process.exit(1)
    }
  }
}