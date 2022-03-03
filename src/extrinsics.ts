const chai = require('chai');
var should = require('chai').should()
import { Extrinsic, Call } from "./interfaces";
import { 
  addConsoleGroup, 
  addConsoleGroupEnd, 
  buildEncodedCallHex, 
  getWallet, 
  buildDispatchable,
  sleep 
} from "./utils";
import { eventsHandler } from "./events";
import { waitForDebugger } from "inspector";

export const checkExtrinsic = (extrinsic: Extrinsic, providers) => {
  const { chain, signer, pallet, call, args, events } = extrinsic

  if (events && !Array.isArray(events)) {
    console.log(`\n⛔ ERROR:'event' invalid type, it should be present as an 'Array' for the following extrinsic:`, JSON.stringify(extrinsic, null, 2))
    process.exit(1)
  }

  if (!events) {
    extrinsic.events = []
  }

  if (signer === undefined) {
    console.log(`\n⛔ ERROR:'signe' should be present for the following extrinsic:`, JSON.stringify(extrinsic, null, 2))
    process.exit(1)
  }

  if (chain === undefined) {
    console.log(`\n⛔ ERROR:'chai' should be present for the following extrinsic:`, JSON.stringify(extrinsic, null, 2))
    process.exit(1)
  } else if (providers[chain.wsPort] === undefined) {
    console.log(`\n⛔ ERROR: The'chai' provider does not exist`)
    process.exit(1)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⛔ ERROR:'palle' &'cal' should be present for the following extrinsic:`, JSON.stringify(extrinsic, null, 2))
    process.exit(1)
  }

  if (!Array.isArray(args)) {
    console.log(`\n⛔ ERROR:'arg' should be present for the following extrinsic:`, JSON.stringify(extrinsic, null, 2))
    process.exit(1)
  }
}

export const sendExtrinsic = async (context, extrinsic: Extrinsic): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      let providers = context.providers
  
      checkExtrinsic(extrinsic, providers)
  
      const { chain, delay, signer, pallet, call, args, events } = extrinsic

      let encodedCallHex = buildEncodedCallHex(context, extrinsic)
      let chainName = providers[chain.wsPort].name
      console.log(`\n🧬 ENCODED CALL: (${chainName}) | '${encodedCallHex}'`)

      let dispatchable = buildDispatchable(context, extrinsic)
      console.log(`\n📩 EXTRINSIC: (${chainName}) | ${pallet}.${call} with ${JSON.stringify(args, null, 2)}\n`)

      let api = providers[chain.wsPort].api
      let wallet = await getWallet(signer)
      let nonce = await api.rpc.system.accountNextIndex(wallet.address);

      await sleep(delay ? delay : context.actionDelay)
      
      await dispatchable.signAndSend(
        wallet,
        { nonce, era: 0 },
        eventsHandler(context, chain, events, resolve, reject)
      );
    }catch(e) {
      addConsoleGroupEnd(2)
      reject(e)
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