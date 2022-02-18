const chai = require('chai');
var should = require('chai').should()
import { Extrinsic } from "./interfaces";
import { addConsoleGroup, addConsoleGroupEnd, getWallet, parseArgs } from "./utils";
import { queriesBuilder } from "./queries";
import { eventsHandler } from "./events";
import { u8aToHex } from '@polkadot/util'


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
  
      const { chain, signer, sudo, pallet, call, args, events } = extrinsic

      let chainName = providers[chain.wsPort].name
      let api = providers[chain.wsPort].api
      let wallet = await getWallet(signer)
      let parsedArgs = parseArgs(context, args)
  
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);
    
      let encodedCall = api.tx[pallet][call](...parsedArgs)
      let dispatchable = sudo === true ? api.tx.sudo.sudo(encodedCall) : encodedCall

      console.log(`\n🧬 ENCODED CALL: (${chainName}) | ${u8aToHex((dispatchable).toU8a().slice(2))}`)
      console.log(`\n📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(args, null, 2)}\n`)

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

    // if (extrinsic.queries) {
    //   await queriesBuilder(context, extrinsic.queries)
    // }
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