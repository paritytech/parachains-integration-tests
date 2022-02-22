const chai = require('chai');
var should = require('chai').should()
import { u8aToHex } from '@polkadot/util'
import { Extrinsic, Call } from "./interfaces";
import { 
  addConsoleGroup, 
  addConsoleGroupEnd, 
  buildEncodedCallHex, 
  getWallet, 
  buildDispatchable 
} from "./utils";
import { eventsHandler } from "./events";

export const checkExtrinsic = (extrinsic: Extrinsic, providers) => {
  const { chain, signer, pallet, call, args, events } = extrinsic

  if (events === undefined) {
    console.log(`\n⚠️  "events" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (signer === undefined) {
    console.log(`\n⚠️  "signer" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (chain === undefined) {
    console.log(`\n⚠️  "chain" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⚠️  The chain name does not exist`)
    process.exit(1)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⚠️  "pallet" & "call" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following extrinsic:`, JSON.stringify(extrinsic))
    process.exit(1)
  }
}

export const sendExtrinsic = async (context, extrinsic: Extrinsic): Promise<any[]> => {
  return new Promise(async resolve => {
    try {
      let providers = context.providers
  
      checkExtrinsic(extrinsic, providers)
  
      const { chain, signer, pallet, call, args, events } = extrinsic

      let encodedCallHex = buildEncodedCallHex(context, extrinsic)
      let chainName = providers[chain.wsPort].name
      console.log(`\n🧬 ENCODED CALL: (${chainName}) | ${encodedCallHex}`)

      let dispatchable = buildDispatchable(context, extrinsic)
      console.log(`\n📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(args, null, 2)}\n`)

      let api = providers[chain.wsPort].api
      let wallet = await getWallet(signer)
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);

      await dispatchable.signAndSend(
        wallet,
        { nonce, era: 0 },
        eventsHandler(context, chain, events, resolve)
      );
    }catch(e) {
      console.log(e)
    }
  })
}

export const extrinsicsBuilder = async (context, extrinsics: Extrinsic[]) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(context, extrinsic)

    addConsoleGroup(2)

    eventsResult.forEach(event => {
      console.log(event.message)
      try {
        chai.assert.equal(event.ok, true, event.message)
      } catch(e) {
        addConsoleGroupEnd(4)
        throw e
      }
    })

    addConsoleGroupEnd(2)
  }
}