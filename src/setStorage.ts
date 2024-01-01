import { SetStorage } from "./interfaces";
import {
  addConsoleGroup,
  addConsoleGroupEnd,
} from './utils';
import { eventListenerBuilder } from './events';

export const setStorage = async (
  context,
  setStorage: SetStorage
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { chain, storage, events } = setStorage;

      let providers = context.providers;
      let chainName = providers[chain.wsPort].name;
      let api = providers[chain.wsPort].api;

      console.log(`\n💽 SET STORAGE: (${chainName}) \n ${JSON.stringify(
        storage,
        null,
        2
      )}`);
      await api.rpc('dev_setStorage', storage);
      await api.rpc('dev_newBlock', { count: 1 });

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

export const setStoragesBuilder = async (context, setStorages: SetStorage[]) => {
  for (const storage of setStorages) {
    let eventsResult = await setStorage(context, storage);

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
