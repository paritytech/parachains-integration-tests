require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import {
  eventResultParser, sleep
} from "../src/common/test";
import {
  getWallet,
} from '../src/common';
import getTestsConfig from "./getTestsConfig"
import { beforeConnectToProviders } from "./beforeConnectToProviders";
import { TestsConfig, Describe, Before, BeforeEach, After, AfterEach, It, Extrinsic } from "./interfaces/test";
import internal from "stream";
import { resolveTypeReferenceDirective } from "typescript";

const EVENT_LISTENER_TIMEOUT = 50000

// const isObject = (variable) => {
//   return (
//     typeof variable === 'object' &&
//     !Array.isArray(variable) &&
//     variable !== null
//   )  
// }

// const isArray = (variable) => {
//   return variable.constructor === Array
// }

const buildTab = (level: number): string => {
  let array = new Array(level).fill('    ')

  let tab = array.reduce((previous, current) => {
    return previous + current
  })

  return tab
}

const extrinsicCallback = (extrinsicEvents, resolve, level) =>
  ({ events = [], status }) => {
    let tab = buildTab(level)
    let results: any[] = []

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { data, method, section, typeDef }} = record

        extrinsicEvents.forEach((event, i) => {
          // console.log("Event", event)
          const { chain, name, attribute: { type, value } } = event

          if (name === `${section}.${method}`) {
            data.forEach((data, j) => {              
              if (type === typeDef[j].type) {
                if (data.toString() === value.toString()) {
                  results.push({ ok: true, message: `\n${tab}✅ EVENT: ${name} received with ${type}: ${value}\n` });
                } else {
                  results.push({ ok: false, message: `\n${tab}❌ EVENT: ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` });
                }
                extrinsicEvents[i].received = true
              }
            });
          }
        })
      });

      // Check here if the event did not happened
      extrinsicEvents.forEach(event => {
          if (event.received === false) {
            results.push({ ok: false, message: `\n${tab}❌ EVENT: ${event.name} never reveived\n` });
          }
      });

      resolve(results)
    }
  } 

const listenToEvent = (providers, event, level): Promise<any> => {
  return new Promise(async resolve => {
    // console.log('Waiting for the Event...\n')
    let tab = buildTab(level)

    const { chain, name, attribute: { type, value } } = event
    let api = providers[chain].api

    const unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event: { data, method, section, typeDef }} = record
        // console.log(section + '.' + method)
        if (name === `${section}.${method}`) {
          data.forEach((data, index) => {
            // console.log("Type", typeDef[index])
            if (type === typeDef[index].type) {
              // console.log("Data", data)
              // console.log("Value", value)
              unsubscribe()

              if (data.toString() === value.toString()) {
                resolve({ ok: true, message: `\n${tab}✅ EVENT: ${name} received with ${type}: ${value}, level: ${level}\n` });
              } else {
                resolve({ ok: false, message: `\n${tab}❌ EVENT: ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}, level: ${level}\n` });
              }
            }
          });
        }
      });
    });

    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n${tab}❌ EVENT: ${name} never reveived\n` });
    }, EVENT_LISTENER_TIMEOUT)
  })
}

const sendExtrinsic = async (providers, extrinsic, level): Promise<any[]> => {
  return new Promise(async resolve => {
    let tab = buildTab(level)

    const { chain, signer, pallet, call, args, events } = extrinsic

    let api = providers[chain].api
    let wallet = await getWallet(signer)

    let nonce = await api.rpc.system.accountNextIndex(wallet.address);

    console.log(`\n${tab}📩 EXTRINSIC: ${pallet}.${call} with ${JSON.stringify(args)}`)

    let modifiedEvents = events.map(event => {
      return {...{received: false}, ...event}
    })

    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 },
      extrinsicCallback(modifiedEvents, resolve, level)
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
  describe(description.name, async () => {
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
        // console.log(desc)
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
    // console.log(testsConfig)
    for (const test of testsConfig.tests) {
      // console.log(test)
      describersBuilder(test, nestingLevel)
    }
  }
}

main()