import _ from 'lodash';
import { Query } from './interfaces';
import { parseArgs, sleep } from './utils';

export const checkQuery = (key: string, query: Query, providers) => {
  const { chain, pallet, call, args } = query;

  if (chain === undefined) {
    console.log(
      `\n⛔ ERROR: 'chain' should be present for the following query id:`,
      key
    );
    process.exit(1);
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⛔ ERROR: The chain name does not exist`);
    process.exit(1);
  }

  if (pallet === undefined || call === undefined) {
    console.log(
      `\n⛔ ERROR: 'pallet' & 'call' should be present for the following query id:`,
      key
    );
    process.exit(1);
  }

  if (args === undefined) {
    console.log(
      `\n⛔ ERROR: 'args' should be present for the following query id:`,
      key
    );
    process.exit(1);
  }
};

export const sendQuery = async (context, key: string, query: Query) => {
  let providers = context.providers;
  checkQuery(key, query, providers);
  const { chain, delay, pallet, call, args } = query;
  let api = providers[chain.wsPort].api;
  let parsedArgs = parseArgs(context, args);
  await sleep(delay ? delay : context.actionDelay);
  let result = await api.query[pallet][call](...parsedArgs);
  if (result && query.selector)
    result = get(result, query.selector);
  return result;
};

const get = (object, path: string): any => {
  object = _.get(object, path);
  if (_.isNil(object)) return object;
  if (object.__UIntType) return BigInt(object);
  return object;
}

export const queriesBuilder = async (
  context,
  queries: { [key: string]: Query }
) => {
  const build = async(key: string) => {
    if (context.variables[`\$${key}`]) {
      console.log(`\n⚠️  WARNING: the key "$${key}" is being reassigned`);
    }
    context.variables[`\$${key}`] = await sendQuery(context, key, queries[key]);
  };

  // Run queries in parallel, provided no arguments reference variables
  const variables = Object.entries(queries).some(([key, query]) =>
      query.args.some(arg => typeof(arg) === 'string' && arg.startsWith("$")));
  if (!variables)
    await Promise.all(Object.keys(queries).map(build));
  else {
    for (let key of Object.keys(queries))
      await build(key);
  }
};
