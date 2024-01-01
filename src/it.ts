import {
  It,
  AsserAction,
  ExtrinsicAction,
  QueryAction,
  CustomAction,
  RpcAction,
  BlockTravelAction,
  TimeTravelAction,
  SetStorageAction,
  SetHeadAction
} from './interfaces';
import { extrinsicsBuilder } from './extrinsics';
import { assertsBuilder } from './asserts';
import { customBuilder } from './custom';
import { queriesBuilder } from './queries';
import { rpcsBuilder } from './rpcs';
import { blockTravelsBuilder } from './blockTravel';
import { timeTravelsBuilder } from './timeTravel';
import { setStoragesBuilder } from './setStorage';
import { setHeadsBuilder } from './setHead';
import { addConsoleGroup, addConsoleGroupEnd } from './utils';

export const itsBuilder = (test: It) => {
  const { name, actions } = test;

  it(name, async function () {
    console.log(`\n🧪 It: \x1b[4m${name}\x1b[0m`);

    addConsoleGroup(2);

    for (let action of actions) {
      const { extrinsics } = action as ExtrinsicAction;
      const { customs } = action as CustomAction;
      const { asserts } = action as AsserAction;
      const { queries } = action as QueryAction;
      const { rpcs } = action as RpcAction;
      const { block_travels } = action as BlockTravelAction;
      const { time_travels } = action as TimeTravelAction;
      const { set_storages } = action as SetStorageAction;
      const { set_heads } = action as SetHeadAction;

      if (customs) {
        for (let custom of customs) {
          await customBuilder(this, custom);
        }
      } else if (extrinsics) {
        await extrinsicsBuilder(this, extrinsics);
      } else if (queries) {
        await queriesBuilder(this, queries);
      } else if (asserts) {
        await assertsBuilder(this, asserts);
      } else if (rpcs) {
        await rpcsBuilder(this, rpcs);
      } else if (block_travels) {
        await blockTravelsBuilder(this, block_travels)
      } else if (time_travels) {
        await timeTravelsBuilder(this, time_travels)
      } else if (set_storages) {
        await setStoragesBuilder(this, set_storages)
      } else if (set_heads) {
        await setHeadsBuilder(this, set_heads)
      }
    }

    addConsoleGroupEnd(2);
  });
};
