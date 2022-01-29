require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import {
  eventResultParser
} from "../src/common/test";
import {
  getWallet,
} from '../src/common';
import getTestsConfig from "./getTestsConfig"
import { beforeConnectToProviders } from "./beforeConnectToProviders";
import { TestsConfig, Describe, Before, BeforeEach, After, AfterEach, It, Extrinsic } from "./interfaces/test";
import internal from "stream";

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

const extrinsicCallback = (extrinsicEvents, done, level) =>
  ({ events = [], status }) => {
    let tab = buildTab(level)

    if (status.isInBlock) {
      events.forEach((record: any) => {
        const { event: { data, method, section, typeDef }} = record

        extrinsicEvents.forEach((event) => {
          const { chain, name, attribute: { type, value } } = event

          if (name === `${section}.${method}`) {
            data.forEach((data, index) => {
              // console.log("Type", typeDef[index])
              
              if (type === typeDef[index].type) {
                // console.log("Data", data)
                // console.log("Value", value)
                let result

                if (data.toString() === value.toString()) {
                  result = { ok: true, message: `\n${tab}✅ EVENT: ${name} received with ${type}: ${value}\n` };
                } else {
                  result = { ok: false, message: `\n${tab}❌ EVENT: ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` };
                }

                console.log(result.message)
                // try {
                  chai.assert.equal(result.ok, true)
                // } catch(err) {
                  // throw 'Event was not received properly'
                  // throw err
                // }
              }
            });
          }
        })
      });
      done()
    }
    
    // process.exit(0)
  } 

const listenToEvent = async (providers, event, level): Promise<any> => {
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
                resolve({ ok: true, message: `\n${tab}✅ EVENT: ${name} received with ${type}: ${value}\n` });
              } else {
                resolve({ ok: false, message: `\n${tab}❌ EVENT: ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}\n` });
              }
            }
          });
        }
      });
    });
    
    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n${tab}❌ EVENT: ${name} never reveived - TIMEOUT\n` });
    }, EVENT_LISTENER_TIMEOUT)  
  })
}

const sendExtrinsic = async (providers, extrinsic, done, level) => {
  // return new Promise(async resolve => {
    let tab = buildTab(level)

    const { chain, signer, pallet, call, args, events } = extrinsic

    let api = providers[chain].api
    let wallet = await getWallet(signer)

    let nonce = await api.rpc.system.accountNextIndex(wallet.address);

    // let promise = new Promise(())
    console.log(`\n${tab}📩 EXTRINSIC: ${pallet}.${call} with ${JSON.stringify(args)}`)

    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 },
      extrinsicCallback(events, done, level)
    );

  // })
}

const extrinsicsBuilder = async (extrinsics: Extrinsic[], providers, done, level: number) => {
  for (const extrinsic of extrinsics) {
    const { events } = extrinsic

    await sendExtrinsic(providers, extrinsic, done, level)

    // let eventsPromises = events?.map(event => {
    //   return listenToEvent(providers, event, level)
    // })

    // console.log("Event Promises", eventsPromises)
    // console.log("Promises", [extrinsicPromise, ...eventsPromises])
    // let results

    // if (eventsPromises) {
    //   let eventsResults = await Promise.all(eventsPromises)

    //   // let extrinsicResult = results.shift()
    //   eventsResults.forEach(event => {
    //     try {
    //       chai.assert.equal(event.ok, true)
    //     } catch(err) {
    //       console.log(event.message)
    //       throw 'Event was not received properly'
    //     }
    //     console.log(event.message)
    //   });
    // }

    // let extrinsicResult = results.shift()
    // console.log(extrinsicResult)

    // console.log("Results", results)


  }
}

const itsBuilder = (test: It, level: number) => {
  const { name, extrinsics } = test

  it(
    name,
    function(done) {
      if (extrinsics) {
        extrinsicsBuilder(extrinsics, this.providers, done, level)
      }
      // chai.assert.equal(true,true)
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
  // console.log("Entra", description.name)
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
        // console.log(it)
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