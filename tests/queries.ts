import { Query } from "./interfaces/test";

export const checkQuery = (key: string, query: Query, providers) => {
  const { chain, pallet, call, args } = query

  if (chain === undefined) {
    console.log(`\n⚠️  "chain" should be defined for the following query id:`, key)
    process.exit(1)
  } else if (providers[chain] === undefined) {
    console.log(`\n⚠️  The chain name does not exist`)
    process.exit(1)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⚠️  "pallet" & "call" should be defined for the following query id:`, key)
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following query id:`, key)
    process.exit(1)
  }
}

export const sendQuery = async (key: string, query: Query, providers) => {
  checkQuery(key, query, providers)
  const { chain, pallet, call, args } = query
  // console.log(providers)
  let result = await providers[chain].api.query[pallet][call](...args)
  return result.toJSON()
}

export const queriesBuilder = async (context, queries: { [key: string]: Query }) => {
    for (let key of Object.keys(queries)) {
      if (!context.queries[key]) {
        context.queries[key] = await sendQuery(key, queries[key], context.providers)
      } else {
        console.log(`\n⚠️  the query key id "${key}" can not be reassigend`)
        process.exit(1)
      }
    }
}