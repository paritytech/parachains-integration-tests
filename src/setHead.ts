import { SetHead } from "./interfaces";
import {
  addConsoleGroup,
  addConsoleGroupEnd,
} from './utils';
import { eventListenerBuilder } from './events';

export const setHead = async (
  context,
  setHead: SetHead
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { chain, block, events } = setHead;

      let providers = context.providers;
      let chainName = providers[chain.wsPort].name;
      let api = providers[chain.wsPort].api;

      console.log(`\n🔗 SET HEAD: (${chainName}) to ${block}`);
      await api.rpc('dev_setHead', block);
      // await api.rpc('dev_newBlock', { count: 1 });

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

export const setHeadsBuilder = async (context, setStorages: SetHead[]) => {
  for (const storage of setStorages) {
    let eventsResult = await setHead(context, storage);

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
