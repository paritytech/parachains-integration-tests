import {
  It,
  AsserAction,
  ExtrinsicAction,
  QueryAction,
  CustomAction,
  RpcAction,
} from './interfaces';
import { extrinsicsBuilder } from './extrinsics';
import { assertsBuilder } from './asserts';
import { customBuilder } from './custom';
import { queriesBuilder } from './queries';
import { rpcsBuilder } from './rpcs';
import { addConsoleGroup, addConsoleGroupEnd } from './utils';

export const itsBuilder = (test: It) => {
  const { name, actions } = test;

  it(name, async function () {
    console.log(`\n🧪 It`);

    addConsoleGroup(2);

    for (let action of actions) {
      const { extrinsics } = action as ExtrinsicAction;
      const { customs } = action as CustomAction;
      const { asserts } = action as AsserAction;
      const { queries } = action as QueryAction;
      const { rpcs } = action as RpcAction;

      if (customs) {
        for (let custom of customs) {
          await customBuilder(this, custom);
        }
      }

      if (extrinsics) {
        await extrinsicsBuilder(this, extrinsics);
      }

      if (queries) {
        await queriesBuilder(this, queries);
      }

      if (asserts) {
        await assertsBuilder(this, asserts);
      }

      if (rpcs) {
        await rpcsBuilder(this, rpcs);
      }
    }

    addConsoleGroupEnd(2);
  });
};
