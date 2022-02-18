const chai = require('chai');
var should = require('chai').should()
import { Extrinsic } from "./interfaces";
import { getWallet, buildTab, parseArgs } from "./utils";
import { queriesBuilder } from "./queries";
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

export const sendExtrinsic = async (context, extrinsic: Extrinsic, indent): Promise<any[]> => {
  return new Promise(async resolve => {
    try {
      let tab = buildTab(indent)
      let providers = context.providers
  
      checkExtrinsic(extrinsic, providers)
  
      const { chain, signer, sudo, pallet, call, args, events } = extrinsic

      let chainName = providers[chain.wsPort].name
      let api = providers[chain.wsPort].api
      let wallet = await getWallet(signer)
      let parsedArgs = parseArgs(context, args)
  
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);
      
      console.log(`\n${tab}📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(args)}`)

      indent+=1

      let encodedCall = api.tx[pallet][call](...parsedArgs)
      let dispatchable = sudo === true ? api.tx.sudo.sudo(encodedCall) : encodedCall

      await dispatchable.signAndSend(
        wallet, 
        { nonce, era: 0 },
        eventsHandler(context, chain, events, resolve, indent)
      );
    }catch(e) {
      console.log(e)
    }
  })
}

export const extrinsicsBuilder = async (context, extrinsics: Extrinsic[], indent: number) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(context, extrinsic, indent)

    if (extrinsic.queries) {
      await queriesBuilder(context, extrinsic.queries)
    }

    eventsResult.forEach(event => {
      console.log(event.message)
      chai.assert.equal(event.ok, true, event.message)
    })
  }
}