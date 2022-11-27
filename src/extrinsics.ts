const chai = require('chai');
var should = require('chai').should();
import { Extrinsic } from './interfaces';
import {
  addConsoleGroup,
  addConsoleGroupEnd,
  buildEncodedCallHex,
  getWallet,
  buildDispatchable,
  sleep,
} from './utils';
import { eventsHandler } from './events';

export const sendExtrinsic = async (
  context,
  extrinsic: Extrinsic
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      let providers = context.providers;

      const { chain, delay, signer, pallet, call, args, events } = extrinsic;

      await sleep(delay ? delay : 0);

      let encodedCallHex = buildEncodedCallHex(context, extrinsic);
      let chainName = providers[chain.wsPort].name;
      console.log(`\n🧬 ENCODED CALL: (${chainName}) | '${encodedCallHex}'`);

      let dispatchable = buildDispatchable(context, extrinsic);
      console.log(
        `\n📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(
          args,
          null,
          2
        )}\n`
      );

      let api = providers[chain.wsPort].api;
      let wallet = await getWallet(signer);
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);
      let handler = events ? eventsHandler(context, chain, events, resolve, reject) : () => { resolve([]) }

      await dispatchable.signAndSend(
        wallet,
        { nonce, era: 0 },
        handler
      );
    } catch (e) {
      addConsoleGroupEnd(2);
      reject(e);
    }
  });
};

export const extrinsicsBuilder = async (context, extrinsics: Extrinsic[]) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(context, extrinsic);

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
