import { Before, BeforeEach, After, AfterEach, Custom, Extrinsic } from "./interfaces/test"
import { customBuilder } from "./custom"
import { sendExtrinsic } from "./extrinsics"
import { queriesBuilder } from "./queries"

export const beforeBuilder = (hook: Before, indent: number) => {
  const { customs, extrinsics } = hook

  before(async function () {
    console.log(`\n🪝 Before`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

export const beforeEachBuilder = async (hook: BeforeEach, indent: number) => {
  const { customs, extrinsics } = hook

  beforeEach(async function () {
    console.log(`\n🪝 Before Each`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

export const afterBuilder = async (hook: After, indent: number) => {
  const { customs, extrinsics } = hook

  after(async function () {
    console.log(`\n🪝 After`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

export const afterEachBuilder = async (hook: AfterEach, indent: number) => {
  const { customs, extrinsics } = hook

  afterEach(async function () {
    console.log(`\n🪝 After Each`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

export const hookBuilder = async (context, customs: Custom[] | undefined, extrinsics: Extrinsic[] | undefined, indent: number) => {
  if (customs && customs.length > 0) {
    for (let custom of customs) {
      await customBuilder(context, custom, indent)
    }
  }

  if (extrinsics && extrinsics.length > 0) {
    for (let extrinsic of extrinsics) {
      indent+=1
      let event = await sendExtrinsic(context.providers, extrinsic, indent)
      console.log(event[0].message)

      if (extrinsic.queries) {
        await queriesBuilder(context, extrinsic.queries)
      }
    }
  }
}