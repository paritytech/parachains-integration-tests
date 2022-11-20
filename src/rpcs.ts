import { Rpc } from './interfaces';
import { parseArgs, sleep } from './utils';

export const sendRpc = async (context, key: string, rpc: Rpc) => {
  let providers = context.providers;
  const { chain, delay, method, call, args } = rpc;
  let api = providers[chain.wsPort].api;
  let parsedArgs = parseArgs(context, args);
  await sleep(delay ? delay : context.actionDelay);
  let result = await api.rpc[method][call](...parsedArgs);
  return result;
};

export const rpcsBuilder = async (context, rpcs: { [key: string]: Rpc }) => {
  for (let key of Object.keys(rpcs)) {
    if (context.variables[`\$${key}`]) {
      console.log(`\n⚠️  WARNING: the key '$${key}' is being reassigned`);
    }
    context.variables[`\$${key}`] = await sendRpc(context, key, rpcs[key]);
  }
};
