import { Before, BeforeEach, After, AfterEach, Custom, Extrinsic } from "./interfaces"
import { customBuilder } from "./custom"
import { sendExtrinsic } from "./extrinsics"
import { queriesBuilder } from "./queries"

export const beforeBuilder = (hook: Before) => {
  const { customs, extrinsics } = hook

  before(async function () {
    console.log(`\n🪝 Before`)
    await hookBuilder(this, customs, extrinsics)
  })
}

export const beforeEachBuilder = async (hook: BeforeEach) => {
  const { customs, extrinsics } = hook

  beforeEach(async function () {
    console.log(`\n🪝 Before Each`)
    await hookBuilder(this, customs, extrinsics)
  })
}

export const afterBuilder = async (hook: After) => {
  const { customs, extrinsics } = hook

  after(async function () {
    console.log(`\n🪝 After`)
    await hookBuilder(this, customs, extrinsics)
  })
}

export const afterEachBuilder = async (hook: AfterEach) => {
  const { customs, extrinsics } = hook

  afterEach(async function () {
    console.log(`\n🪝 After Each`)
    await hookBuilder(this, customs, extrinsics)
  })
}

export const hookBuilder = async (context, customs: Custom[] | undefined, extrinsics: Extrinsic[] | undefined) => {
  if (customs && customs.length > 0) {
    for (let custom of customs) {
      await customBuilder(context, custom)
    }
  }

  if (extrinsics && extrinsics.length > 0) {
    for (let extrinsic of extrinsics) {
      let event = await sendExtrinsic(context, extrinsic)
      console.log(event[0].message)

      // if (extrinsic.queries) {
      //   await queriesBuilder(context, extrinsic.queries)
      // }
    }
  }
}