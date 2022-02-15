import { It } from "./interfaces/test"
import { extrinsicsBuilder } from "./extrinsics"
import { assertsBuilder } from "./asserts"
import { customBuilder } from "./custom"

const checkIt = (it: It) => {
  if (!it.name) {
    console.log(`\n⚠️  "name" should be defined for it:`, JSON.stringify(it))
    process.exit(1)
  }
}

export const itsBuilder = (test: It, indent: number) => {
  checkIt(test)

  const { name, customs, extrinsics, asserts } = test

  it(
    name,
    async function () {
      console.log(`\n🧪 It`)

      indent+=1

      // for (let key of Object.keys(test)) {
      //   if (key === 'customs') {
      //     for (let custom of test[key]) {
      //       await customBuilder(this, custom, indent)
      //     }
      //   } else if (key === 'extrinsics') {
      //     await extrinsicsBuilder(this, test[key], this.providers, indent)
      //   } else if (key === 'asserts') {
      //     await assertsBuilder(this, test[key], indent)
      //   } else {
      //     console.log(`\n⚠️  "${key}" is not a valid key for "its", only "customs", "extrinsics" and "asserts" are`)
      //     process.exit(1)
      //   }
      // }

      if (customs) {  
        for (let custom of customs) {
          await customBuilder(this, custom, indent)
        }
      }

      if (extrinsics) {  
        await extrinsicsBuilder(this, extrinsics, indent)
      }

      if (asserts) {
        await assertsBuilder(this, asserts, indent)
      }
    }
  )
}