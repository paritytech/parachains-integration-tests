import { TimeTravel } from "./interfaces";
import {
  addConsoleGroup,
  addConsoleGroupEnd,
} from './utils';
import { eventListenerBuilder } from './events';
import { CHOPSTICKS_MODE } from "./constants";

export const timeTravel = async (
  context,
  timeTravel: TimeTravel
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    let providers = context.providers;
    const { chain, date, events } = timeTravel;

    if (providers[chain.wsPort].mode === CHOPSTICKS_MODE) {
      try {
        let providers = context.providers;
        let chainName = providers[chain.wsPort].name;
        let api = providers[chain.wsPort].api;

        console.log(`\n🕓 TIME TRAVEL: (${chainName}) to ${date}`);
        await api.rpc('dev_timeTravel', [date]);
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
    } else {
      console.log("\n⚠️  WARNING: 'time_travels' is only supporting in chopsticks mode; Ignoring")
      resolve([]);
    }
  });
}

export const timeTravelsBuilder = async (context, timeTravels: TimeTravel[]) => {
  for (const time of timeTravels) {
    let eventsResult = await timeTravel(context, time);

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
