import { Query } from "./interfaces";
import { parseArgs, sleep } from "./utils";

export const checkQuery = (key: string, query: Query, providers) => {
  const { chain, pallet, call, args } = query

  if (chain === undefined) {
    console.log(`\n⛔ ERROR: "chain" should be defined for the following query id:`, key)
    process.exit(1)
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⛔ ERROR: The chain name does not exist`)
    process.exit(1)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⛔ ERROR: "pallet" & "call" should be defined for the following query id:`, key)
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⛔ ERROR: "args" should be defined for the following query id:`, key)
    process.exit(1)
  }
}

export const sendQuery = async (context, key: string, query: Query) => {
  let providers = context.providers
  checkQuery(key, query, providers)
  const { chain, pallet, call, args } = query
  let api = providers[chain.wsPort].api
  let parsedArgs = parseArgs(context, args)
  await sleep(context.queryDelay)
  let result = await api.query[pallet][call](...parsedArgs)
  return result
}

export const queriesBuilder = async (context, queries: { [key: string]: Query }) => {
    for (let key of Object.keys(queries)) {
      if (context.variables[`\$${key}`]) {
        console.log(`\n⚠️  WARNING: the key "$${key}" is being reassigned`)
      }
      context.variables[`\$${key}`] = await sendQuery(context, key, queries[key])
    }
}
