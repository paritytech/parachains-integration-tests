import { Custom } from "./interfaces/test"
import { buildTab } from "./utils"

export const checkCustom = (custom: Custom) => {
  const { path, args } = custom

  if (path === undefined) {
    console.log(`\n⚠️  "path" should be defined for the following custom file:`, JSON.stringify(custom))
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following custom file:`, JSON.stringify(custom))
    process.exit(1)
  }
}

export const customBuilder = async (context, custom: Custom, indent) => {
  let tab = buildTab(indent)
  checkCustom(custom)
  const { path, args } = custom
  const customFunction = await import(path)
  await customFunction.default(context, tab, args)
}