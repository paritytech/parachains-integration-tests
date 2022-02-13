const chai = require('chai');
var should = require('chai').should()
import { Extrinsic, EventResult } from "./interfaces/test";
import { getWallet, buildTab } from "./utils";
import { EVENT_LISTENER_TIMEOUT } from "../src/config";

export const checkExtrinsic = (extrinsic: Extrinsic, providers) => {
  const { chain, signer, pallet, call, args, events } = extrinsic

  if (events === undefined) {
    console.log(`\n⚠️  "events" should be defined for the following extrinsic:`, extrinsic)
    process.exit(0)
  }

  if (signer === undefined) {
    console.log(`\n⚠️  "signer" should be defined for the following extrinsic:`, extrinsic)
    process.exit(0)
  }

  if (chain === undefined) {
    console.log(`\n⚠️  "chain" should be defined for the following extrinsic:`, extrinsic)
    process.exit(0)
  } else if (providers[chain] === undefined) {
    console.log(`\n⚠️  The chain name does not exist`)
    process.exit(0)
  }

  if (pallet === undefined || call === undefined) {
    console.log(`\n⚠️  "pallet" & "call" should be defined for the following extrinsic:`, extrinsic)
    process.exit(0)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following extrinsic:`, extrinsic)
    process.exit(0)
  }
}

export const listenToEvent = (providers, event, indent): Promise<EventResult> => {
  return new Promise(async resolve => {
    let tab = buildTab(indent)

    const { chain, name, attribute } = event
    let api = providers[chain].api

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event: { data, method, section, typeDef }} = record

        if (name === `${section}.${method}`) {
          if (attribute) {
            const { type, value } = attribute

            data.forEach((data, index) => {
              if (type === typeDef[index].type) {
                unsubscribe()
  
                if (data.toString() === value.toString()) {
                  resolve({ 
                    ok: true, 
                    message: `\n${tab}✅ EVENT: (${chain}) | ${name} received with [${type}: ${value}]\n` 
                  });
                } else {
                  resolve({ 
                    ok: false, 
                    message: `\n${tab}❌ EVENT: (${chain}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` });
                }
              }
            });
          } else {
            resolve({ ok: true, message: `\n${tab}✅ EVENT: (${chain}) | ${name} received` });
          }
        }
      });
    });

    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n${tab}❌ EVENT: (${chain}) | ${name} never reveived\n` });
    }, EVENT_LISTENER_TIMEOUT)
  })
}

export const extrinsicCallback = (providers, extrinsicEvents, context, resolve, indent) =>
  async ({ events = [], status }) => {
    let tab = buildTab(indent)
    let results: EventResult[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { data, method, section, typeDef }} = record

        extrinsicEvents.forEach((event, i) => {
          const { chain, name, local, attribute } = event
          context = chain ? chain : context

          if (local && name === `${section}.${method}`) {
            if (attribute) {
              const { type, value } = attribute

              data.forEach((data, j) => {              
                if (type === typeDef[j].type) {
                  if (data.toString() === value.toString()) {
                    results.push({ 
                      ok: true, 
                      message: `\n${tab}✅ EVENT: (${context}) | ${name} received with [${type}: ${value}]\n` 
                    });
                  } else {
                    results.push({ 
                      ok: false, 
                      message: `\n${tab}❌ EVENT: (${context}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` 
                    });
                  }
                  extrinsicEvents[i].received = true
                }
              });
            } else {
              results.push({ 
                ok: true, 
                message: `\n${tab}✅ EVENT: (${context}) | ${name} received` 
              });
            }
          }
        })
      });

      let eventsPromises: Promise<EventResult>[] = []

      extrinsicEvents.forEach(event => {
          if (event.local && event.received === false) {
            results.push({ 
              ok: false, 
              message: `\n${tab}❌ EVENT: (${context}) | ${event.name} never reveived\n` 
            });
          } else if (!event.local && event.received === false) {
            indent+=1
            eventsPromises.push(listenToEvent(providers, event, indent))
          }
      });

      let espera = await Promise.all(eventsPromises)

      results = results.concat(espera)

      resolve(results)
    }
  }


export const sendExtrinsic = async (providers, extrinsic, indent): Promise<any[]> => {
  return new Promise(async resolve => {
    let tab = buildTab(indent)

    checkExtrinsic(extrinsic, providers)

    const { chain, signer, pallet, call, args, events } = extrinsic

    let api = providers[chain].api
    let wallet = await getWallet(signer)

    let nonce = await api.rpc.system.accountNextIndex(wallet.address);
    
    console.log(`\n${tab}📩 EXTRINSIC: (${chain}) | ${pallet}.${call} with ${JSON.stringify(args)}`)

    let modifiedEvents = events.map(event => {
      if (event.chain === chain || !event.chain) {
        event = {...{ local: true, received: false }, ...event}
      } else {
        event = {...{ local: false, received: false }, ...event}
      }
      return event
    })

    indent+=1

    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 },
      extrinsicCallback(providers, modifiedEvents, chain, resolve, indent)
    );
  })
}

export const extrinsicsBuilder = async (extrinsics: Extrinsic[], providers, indent: number) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(providers, extrinsic, indent)

    eventsResult.forEach(event => {
      console.log(event.message)
      chai.assert.equal(event.ok, true, event.message)
      })
  }
}