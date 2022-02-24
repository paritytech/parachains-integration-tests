import { It, AsserAction, ExtrinsicAction, QueryAction, CustomAction } from "./interfaces"
import { extrinsicsBuilder } from "./extrinsics"
import { assertsBuilder } from "./asserts"
import { customBuilder } from "./custom"
import { queriesBuilder } from "./queries"
import { addConsoleGroup, addConsoleGroupEnd } from "./utils"

const checkIt = (it: It) => {
  const { name, actions } = it

  if (!name) {
    console.log(`\n🚫 ERROR: "name" should be defined for the following 'it':`, JSON.stringify(it, null, 2))
    process.exit(1)
  }
  if (actions && !Array.isArray(actions)) {
    console.log(`\n🚫 ERROR: "actions" invalid type, it should be of type Array for the 'it':`, JSON.stringify(it, null, 2))
    process.exit(1)
  }
}

export const itsBuilder = (test: It) => {
  checkIt(test)

  // const { name, customs, extrinsics, asserts } = test
  const { name, actions } = test

  it(
    name,
    async function () {
      console.log(`\n🧪 It`)

      addConsoleGroup(2)

      // for (let key of Object.keys(test)) {
      //   if (key === 'customs') {
      //     for (let custom of test[key]) {
      //       await customBuilder(this, custom)
      //     }
      //   } else if (key === 'extrinsics') {
      //     await extrinsicsBuilder(this, test[key], this.providers)
      //   } else if (key === 'asserts') {
      //     await assertsBuilder(this, test[key])
      //   } else {
      //     console.log(`\n⚠️  "${key}" is not a valid key for "its", only "customs", "extrinsics" and "asserts" are`)
      //     process.exit(1)
      //   }
      // }

      for (let action of actions) {
        const { extrinsics } = action as ExtrinsicAction
        const { customs } = action as CustomAction
        const { asserts } = action as AsserAction
        const { queries } = action as QueryAction

        if (customs) {
          for (let custom of customs) {
            await customBuilder(this, custom)
          }
        }
  
        if (extrinsics) {  
          await extrinsicsBuilder(this, extrinsics)
        }

        if (queries) {
          await queriesBuilder(this, queries)
        }
  
        if (asserts) {
          await assertsBuilder(this, asserts)
        }
      }

      addConsoleGroupEnd(2)
    }
  )
}