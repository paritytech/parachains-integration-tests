import { It } from "./interfaces/test"
import { extrinsicsBuilder } from "./extrinsics"

export const itsBuilder = (test: It, indent: number) => {
  const { name, extrinsics } = test

  it(
    name,
    async function () {
      console.log(`\n🧪 It`)

      if (extrinsics) {
        indent+=1
        await extrinsicsBuilder(this, extrinsics, this.providers, indent)
      }
    }
  )
}