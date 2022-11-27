import { Query } from './interfaces';
import { parseArgs, sleep } from './utils';

export const sendQuery = async (context, key: string, query: Query) => {
  let providers = context.providers;
  const { chain, delay, pallet, call, args } = query;
  let api = providers[chain.wsPort].api;
  let parsedArgs = parseArgs(context, args);
  await sleep(delay ? delay : context.actionDelay);
  let result = await api.query[pallet][call](...parsedArgs);
  return result;
};

export const queriesBuilder = async (
  context,
  queries: { [key: string]: Query }
) => {
  for (let key of Object.keys(queries)) {
    if (context.variables[`\$${key}`]) {
      console.log(`\n⚠️  WARNING: the key "$${key}" is being reassigned`);
    }
    context.variables[`\$${key}`] = await sendQuery(context, key, queries[key]);
  }
};
