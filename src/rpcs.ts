const chai = require('chai');
var should = require('chai').should();
import { EventResult, Rpc } from './interfaces';
import { addConsoleGroup, addConsoleGroupEnd, parseArgs, sleep } from './utils';
import { eventListenerBuilder } from './events';

export const sendRpc = async (
  context,
  key: string,
  rpc: Rpc
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    let providers = context.providers;
    const { events, chain, delay, method, call, args } = rpc;
    let api = providers[chain.wsPort].api;
    let parsedArgs = parseArgs(context, args);
    await sleep(delay ? delay : context.actionDelay);
    context.variables[`\$${key}`] = await api.rpc[method][call](...parsedArgs);

    if (events) {
      await eventListenerBuilder(context, chain, events, resolve, reject);
    } else {
      let eventsResults: EventResult[] = [];
      resolve(eventsResults);
    }
  });
};

export const rpcsBuilder = async (context, rpcs: { [key: string]: Rpc }) => {
  for (let key of Object.keys(rpcs)) {
    if (context.variables[`\$${key}`]) {
      console.log(`\n⚠️  WARNING: the key '$${key}' is being reassigned\n`);
    }

    let eventsResult = await sendRpc(context, key, rpcs[key]);

    addConsoleGroup(2);

    let fail;

    eventsResult.forEach((event) => {
      console.log(event.message);
      try {
        chai.assert.equal(event.ok, true, event.message);
      } catch (e) {
        fail = e;
      }
    });

    if (fail) {
      addConsoleGroupEnd(4);
      throw fail;
    }

    addConsoleGroupEnd(2);
  }
};
