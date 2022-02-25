import { 
  Before, 
  BeforeEach, 
  After, 
  AfterEach,
  Hook, 
  Action,
  ExtrinsicAction,
  QueryAction,
  AsserAction,
  CustomAction
} from "./interfaces"
import { customBuilder } from "./custom"
import { extrinsicsBuilder } from "./extrinsics"
import { queriesBuilder } from "./queries"
import { assertsBuilder } from './asserts'
import { addConsoleGroup, addConsoleGroupEnd } from "./utils"

const checkHooks = (hook: Hook) => {
  const { name, actions } = hook
  
  if (!name) {
    console.log(`\n⛔ ERROR: "name" should be defined for all hooks`)
    process.exit(1)
  }

  if (actions && !Array.isArray(actions)) {
    console.log(`\n⛔ ERROR: "actions" invalid type, it should be of type Array for the hook: ${hook.name}`)
    process.exit(1)
  }

  if (!actions) {
    hook.actions = []
  }
}

export const beforeBuilder = (hook: Before) => {
  checkHooks(hook)

  const { name, actions } = hook

  before(async function () {
    console.log(`\n🪝 Before: ${name}`)
    await hookBuilder(this, actions)
  })
}

export const beforeEachBuilder = async (hook: BeforeEach) => {
  const { name, actions } = hook

  beforeEach(async function () {
    console.log(`\n🪝 Before Each: ${name}`)
    await hookBuilder(this, actions)
  })
}

export const afterBuilder = async (hook: After) => {
  const { name, actions } = hook

  after(async function () {
    console.log(`\n🪝 After: ${name}`)
    await hookBuilder(this, actions)
  })
}

export const afterEachBuilder = async (hook: AfterEach) => {
  const { name, actions } = hook

  afterEach(async function () {
    console.log(`\n🪝 After Each: ${name}`)
    await hookBuilder(this, actions)
  })
}

export const hookBuilder = async (context, actions: Action[]) => {
  addConsoleGroup(2)

  for (let action of actions) {
    const { extrinsics } = action as ExtrinsicAction
    const { customs } = action as CustomAction
    const { asserts } = action as AsserAction
    const { queries } = action as QueryAction

    if (customs) {
      for (let custom of customs) {
        await customBuilder(context, custom)
      }
    }

    if (extrinsics) {  
      await extrinsicsBuilder(context, extrinsics)
    }

    if (queries) {
      await queriesBuilder(context, queries)
    }

    if (asserts) {
      await assertsBuilder(context, asserts)
    }
  }

  addConsoleGroupEnd(2)
  // if (customs && customs.length > 0) {
  //   for (let custom of customs) {
  //     await customBuilder(context, custom)
  //   }
  // }

  // if (extrinsics && extrinsics.length > 0) {
  //   for (let extrinsic of extrinsics) {
  //     let event = await sendExtrinsic(context, extrinsic)
  //     console.log(event[0].message)

  //     // if (extrinsic.queries) {
  //     //   await queriesBuilder(context, extrinsic.queries)
  //     // }
  //   }
  // }
}