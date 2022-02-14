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

      if (customs) {  
        for (let custom of customs) {
          await customBuilder(this, custom, indent)
        }
      }

      if (extrinsics) {  
        await extrinsicsBuilder(this, extrinsics, this.providers, indent)
      }

      if (asserts) {
        console.log("Entra en Asserts")
        await assertsBuilder(this, asserts, indent)
      }
    }
  )
}