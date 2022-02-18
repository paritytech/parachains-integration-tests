import { It } from "./interfaces"
import { extrinsicsBuilder } from "./extrinsics"
import { assertsBuilder } from "./asserts"
import { customBuilder } from "./custom"
import { addConsoleGroups } from "./utils"

const checkIt = (it: It) => {
  if (!it.name) {
    console.log(`\n⚠️  "name" should be defined for it:`, JSON.stringify(it))
    process.exit(1)
  }
}

export const itsBuilder = (test: It) => {
  checkIt(test)

  const { name, customs, extrinsics, asserts } = test

  it(
    name,
    async function () {
      console.log(`\n🧪 It`)
      console.group()
      console.group()

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

      if (customs) {  
        for (let custom of customs) {
          await customBuilder(this, custom)
        }
      }

      if (extrinsics) {  
        await extrinsicsBuilder(this, extrinsics)
      }

      if (asserts) {
        await assertsBuilder(this, asserts)
      }

      console.groupEnd()
      console.groupEnd()
    }
  )
}