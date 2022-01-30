require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import {
  getWallet,
} from '../src/common';
import getTestsConfig from "./getTestsConfig"
import { beforeConnectToProviders } from "./beforeConnectToProviders";
import { TestsConfig, Describe, Before, BeforeEach, After, AfterEach, It, Extrinsic, EventResult } from "./interfaces/test";

const EVENT_LISTENER_TIMEOUT = 50000

const buildTab = (level: number): string => {
  let array = new Array(level).fill('    ')

  let tab = array.reduce((previous, current) => {
    return previous + current
  })

  return tab
}

const listenToEvent = (providers, event, level): Promise<EventResult> => {
  return new Promise(async resolve => {
    let tab = buildTab(level)

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
                    message: `\n${tab}\t✅ EVENT: (${chain}) | ${name} received with [${type}: ${value}]\n` 
                  });
                } else {
                  resolve({ 
                    ok: false, 
                    message: `\n${tab}\t❌ EVENT: (${chain}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` });
                }
              }
            });
          } else {
            resolve({ ok: true, message: `\n${tab}\t✅ EVENT: (${chain}) | ${name} received` });
          }
        }
      });
    });

    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n${tab}\t❌ EVENT: (${chain}) | ${name} never reveived\n` });
    }, EVENT_LISTENER_TIMEOUT)
  })
}

const extrinsicCallback = (providers, extrinsicEvents, context, resolve, level) =>
  async ({ events = [], status }) => {
    let tab = buildTab(level)
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
                      message: `\n${tab}\t✅ EVENT: (${context}) | ${name} received with [${type}: ${value}]\n` 
                    });
                  } else {
                    results.push({ 
                      ok: false, 
                      message: `\n${tab}\t❌ EVENT: (${context}) | ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` 
                    });
                  }
                  extrinsicEvents[i].received = true
                }
              });
            } else {
              results.push({ 
                ok: true, 
                message: `\n${tab}\t✅ EVENT: (${context}) | ${name} received` 
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
              message: `\n${tab}\t❌ EVENT: (${context}) | ${event.name} never reveived\n` 
            });
          } else if (!event.local && event.received === false) {
            eventsPromises.push(listenToEvent(providers, event, level))
          }
      });

      let espera = await Promise.all(eventsPromises)

      results = results.concat(espera)

      resolve(results)
    }
  }

const sendExtrinsic = async (providers, extrinsic, level): Promise<any[]> => {
  return new Promise(async resolve => {
    let tab = buildTab(level)

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

    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 },
      extrinsicCallback(providers, modifiedEvents, chain, resolve, level)
    );
  })
}

const extrinsicsBuilder = async (extrinsics: Extrinsic[], providers, level: number) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(providers, extrinsic, level)

    eventsResult.forEach(event => {
      console.log(event.message)
      chai.assert.equal(event.ok, true, event.message)
      })
  }
}

const itsBuilder = (test: It, level: number) => {
  const { name, extrinsics } = test

  it(
    name,
    async function () {
      if (extrinsics) {
        await extrinsicsBuilder(extrinsics, this.providers, level)
      }
    }
  )
}

const beforeBuilder = async (before: Before) => {
  console.log("Before", before)
}

const beforeEachBuilder = async (before: BeforeEach) => {
  console.log("BeforeEach", before)
}

const afterBuilder = async (before: After) => {
  console.log("After", before)
}

const afterEachBuilder = async (before: AfterEach) => {
  console.log("AfterEach", before)
}

const describersBuilder = (description: Describe, level: number) => {
  describe(`#${description.name}`, async () => {
    level += 1

    let builders = [
      { attribute: description.before, func: beforeBuilder },
      { attribute: description.beforeEach, func: beforeEachBuilder },
      { attribute: description.after, func: afterBuilder },
      { attribute: description.afterEach, func: afterEachBuilder },
    ]

    for (const builder of builders) {
      if (builder.attribute && builder.attribute.length > 1)
        for (const attr of builder.attribute) {
          await builder.func(attr)
        }
    }

    if (description.its && description.its.length > 0) {
      for (const it of description.its) {
        itsBuilder(it, level)
      }
    }

    if (description.describes && description.describes.length > 0) {
      for (const desc of description.describes) {
        describersBuilder(desc, level)
      }
    }
  })
}

const main = async () => {
  beforeConnectToProviders()

  let testsConfig: TestsConfig

  let nestingLevel = -1;

  for (testsConfig of getTestsConfig()) {
    for (const test of testsConfig.tests) {
      describersBuilder(test, nestingLevel)
    }
  }
}

main()