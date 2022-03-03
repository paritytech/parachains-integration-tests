import { Rpc } from "./interfaces";
import { parseArgs, sleep } from "./utils";

export const checkRpc = (key: string, rpc: Rpc, providers) => {
  const { chain, method, call, args } = rpc

  if (chain === undefined) {
    console.log(`\n⛔ ERROR: 'chain' should be present for the following rpc id:`, key)
    process.exit(1)
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⛔ ERROR: The chain name does not exist`)
    process.exit(1)
  }

  if (method === undefined || call === undefined) {
    console.log(`\n⛔ ERROR: 'pallet' & 'method' should be present for the following rpc id:`, key)
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⛔ ERROR: 'args' should be present for the following rpc id:`, key)
    process.exit(1)
  }
}

export const sendRpc = async (context, key: string, rpc: Rpc) => {
  let providers = context.providers
  checkRpc(key, rpc, providers)
  const { chain, delay, method, call, args } = rpc
  let api = providers[chain.wsPort].api
  let parsedArgs = parseArgs(context, args)
  await sleep(delay ? delay : context.actionDelay)
  let result = await api.rpc[method][call](...parsedArgs)
  return result
}

export const rpcsBuilder = async (context, rpcs: { [key: string]: Rpc }) => {
    for (let key of Object.keys(rpcs)) {
      if (context.variables[`\$${key}`]) {
        console.log(`\n⚠️  WARNING: the key '$${key}' is being reassigned`)
      }
      context.variables[`\$${key}`] = await sendRpc(context, key, rpcs[key])
    }
}
