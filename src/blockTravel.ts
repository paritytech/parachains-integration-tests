import { BlockTravel } from "./interfaces";
import {
  addConsoleGroup,
  addConsoleGroupEnd,
} from './utils';
import { eventListenerBuilder } from './events';

export const blockTravel = async (
  context,
  blockTravel: BlockTravel
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { chain, count, to, events } = blockTravel;

      let providers = context.providers;
      let chainName = providers[chain.wsPort].name;
      let api = providers[chain.wsPort].api;

      if (count) {
        console.log(`\n📦 BLOCK TRAVEL: (${chainName}) | ${count} blocks`);
        await api.rpc('dev_newBlock', { count });
      } else if (to) {
        console.log(`\n📦 BLOCK TRAVEL: (${chainName}) | to block #${to}`);
        await api.rpc('dev_newBlock', { to });
      }

      if (events) {
        await eventListenerBuilder(context, chain, events, resolve, reject);
      } else {
        resolve([]);
      }
    } catch (e) {
      addConsoleGroupEnd(2);
      reject(e);
    }
  });
}

export const blockTravelsBuilder = async (context, blockTravels: BlockTravel[]) => {
  for (const block of blockTravels) {
    let eventsResult = await blockTravel(context, block);

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
