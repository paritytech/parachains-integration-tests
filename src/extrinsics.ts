const chai = require('chai');
var should = require('chai').should();
import { blake2AsHex } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, compactAddLength } from '@polkadot/util';
import { Extrinsic } from './interfaces';
import {
  addConsoleGroup,
  addConsoleGroupEnd,
  buildEncodedCallHex,
  getWallet,
  buildDispatchable,
  sleep,
} from './utils';
import { eventsHandler, eventListenerBuilder } from './events';

export const sendExtrinsic = async (
  context,
  extrinsic: Extrinsic
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      let providers = context.providers;

      const { chain, delay, signer, pallet, sudo, call, args, events } = extrinsic;

      await sleep(delay ? delay : 0);

      let encodedCallHex = buildEncodedCallHex(context, extrinsic);
      let chainName = providers[chain.wsPort].name;
      console.log(`\n🧬 ENCODED CALL: (${chainName}) | '${encodedCallHex.encoded}'`);

      let dispatchable = buildDispatchable(context, extrinsic);
      console.log(
        `\n📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(
          args,
          null,
          2
        )}\n`
      );

      let api = providers[chain.wsPort].api;
      let lastBlock = Number(providers[chain.wsPort].lastBlock);

      let wallet = await getWallet(signer);
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);
      let handler = events
        ? eventsHandler(context, chain, events, resolve, reject)
        : () => {
            resolve([]);
          };

      // We try to schedule with chopsticks and 'Root' origin
      if (sudo === true && api.tx.sudo === undefined && providers[chain.wsPort].mode === "chopsticks") {
        console.log(`⚠️  Sudo is not available on ${chainName}, scheduling the call instead with 'dev_setStorage'(chopsticks) and Root Origin\n`);
        let call = encodedCallHex.encoded;
        let callLength = encodedCallHex.len;
        let hashedCall = encodedCallHex.hash;

        await api.rpc('dev_setStorage', {
            preimage: {
                preimageFor: [
                    [
                        [[hashedCall, callLength]],
                        u8aToHex(compactAddLength(hexToU8a(call)))
                    ]
                ]
            }
        })

        await api.rpc('dev_setStorage', {
          scheduler: {
            agenda: [
              [
                [lastBlock + 1],
                [
                  {
                    call: {
                      Lookup: {
                        hash_: hashedCall,
                        len: callLength,
                      },
                    },
                    origin: {
                      system: 'Root',
                    },
                  },
                ],
              ],
            ],
          },
        });
        await api.rpc('dev_newBlock');
        if (events) {
          await eventListenerBuilder(context, chain, events, resolve, reject);
        } else {
          resolve([]);
        }
      } else {
        await dispatchable.signAndSend(wallet, { nonce, era: 0 }, handler);
      }
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
