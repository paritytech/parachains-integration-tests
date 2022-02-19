import { resolve } from "path"
import { Custom } from "./interfaces"
import { parseArgs } from "./utils"

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

export const customBuilder = async (context, custom: Custom) => {
  checkCustom(custom)
  const { path, args } = custom
  let parsedArgs = parseArgs(context, args)
  let absolutePath = resolve(context.testPath, path)
  let customFunction

  try {
    customFunction = await import(absolutePath)
  } catch(e) {
    console.log(`\n⚠️  no file can be found in ${path}`)
    process.exit(1)
  }

  if (typeof customFunction.default === 'function') {
    await customFunction.default(context, parsedArgs)
  } else {
    console.log(`\n⚠️  a funcion must be default exported from the file ${path}`)
    process.exit(1)
  }
}