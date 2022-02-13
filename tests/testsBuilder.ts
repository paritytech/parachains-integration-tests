require('dotenv').config()
import fs from "fs";
import pathBuilder from "path";
const chai = require('chai');
var should = require('chai').should()
import {
  getWallet,
} from '../src/common';
import getTestsConfig from "./getTestsConfig"
import { beforeConnectToProviders } from "./beforeConnectToProviders";
import { TestsConfig, Describe, Before, BeforeEach, After, AfterEach, It, Extrinsic, EventResult, Custom } from "./interfaces/test";

const EVENT_LISTENER_TIMEOUT = 50000

const buildTab = (indent: number): string => {
  let array = indent > 0 ? new Array(indent).fill('    ') : ['    ']

  let tab = array.reduce((previous, current) => {
    return previous + current
  })

  return tab
}

const checkExtrinsic = (extrinsic: Extrinsic, providers) => {
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

const checkCustom = (custom: Custom) => {
  const { path, args } = custom

  if (path === undefined) {
    console.log(`\n⚠️  "path" should be defined for the following custom file:`, custom)
    process.exit(0)
  }

  if (args === undefined) {
    console.log(`\n⚠️  "args" should be defined for the following custom file:`, custom)
    process.exit(0)
  }
}

const listenToEvent = (providers, event, indent): Promise<EventResult> => {
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

const extrinsicCallback = (providers, extrinsicEvents, context, resolve, indent) =>
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

const sendExtrinsic = async (providers, extrinsic, indent): Promise<any[]> => {
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

const extrinsicsBuilder = async (extrinsics: Extrinsic[], providers, indent: number) => {
  for (const extrinsic of extrinsics) {
    let eventsResult = await sendExtrinsic(providers, extrinsic, indent)

    eventsResult.forEach(event => {
      console.log(event.message)
      chai.assert.equal(event.ok, true, event.message)
      })
  }
}

const itsBuilder = (test: It, indent: number) => {
  const { name, extrinsics } = test

  it(
    name,
    async function () {
      console.log(`\n🧪 It`)

      if (extrinsics) {
        indent+=1
        await extrinsicsBuilder(extrinsics, this.providers, indent)
      }
    }
  )
}

const customBuilder = async (context, custom: Custom, indent) => {
  let tab = buildTab(indent)
  checkCustom(custom)
  const { path, args } = custom
  const customFunction = await import(path)
  await customFunction.default(context, tab, args)
}

const hookBuilder = async (context, customs: Custom[] | undefined, extrinsics: Extrinsic[] | undefined, indent: number) => {
  if (customs && customs.length > 0) {
    for (let custom of customs) {
      await customBuilder(context, custom, indent)
    }
  }

  if (extrinsics && extrinsics.length > 0) {
    for (let extrinsic of extrinsics) {
      indent+=1
      let event = await sendExtrinsic(context.providers, extrinsic, indent)
      console.log(event[0].message)
    }
  }
}

const beforeBuilder = (hook: Before, indent: number) => {
  const { customs, extrinsics } = hook

  before(async function () {
    console.log(`\n🪝 Before`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

const beforeEachBuilder = async (hook: BeforeEach, indent: number) => {
  const { customs, extrinsics } = hook

  beforeEach(async function () {
    console.log(`\n🪝 Before Each`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

const afterBuilder = async (hook: After, indent: number) => {
  const { customs, extrinsics } = hook

  after(async function () {
    console.log(`\n🪝 After`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

const afterEachBuilder = async (hook: AfterEach, indent: number) => {
  const { customs, extrinsics } = hook

  afterEach(async function () {
    console.log(`\n🪝 After Each`)
    await hookBuilder(this, customs, extrinsics, indent)
  })
}

const describersBuilder = (description: Describe) => {
  describe(`✔️  ${description.name}`, async () => {
    before(function () {
      for (let i = 0; i < 4; i++){
        console.group()

      }
    })

    after(function () {
      for (let i = 0; i < 4; i++){
        console.groupEnd()
      }
    })
    let indent = 0

    let builders = [
      { attribute: description.before, func: beforeBuilder },
      { attribute: description.beforeEach, func: beforeEachBuilder },
      { attribute: description.after, func: afterBuilder },
      { attribute: description.afterEach, func: afterEachBuilder },
    ]

    for (const builder of builders) {
      if (builder.attribute && builder.attribute.length > 0)
        for (const attr of builder.attribute) {
          builder.func(attr, indent)
        }
    }

    if (description.its && description.its.length > 0) {
      for (const it of description.its) {
        itsBuilder(it, indent)
      }
    }

    if (description.describes && description.describes.length > 0) {
      for (const desc of description.describes) {
        describersBuilder(desc)
      }
    }
  })
}

const main = async () => {
  beforeConnectToProviders()

  let testsConfig: TestsConfig
  
  for (testsConfig of getTestsConfig()) {
    for (const test of testsConfig.tests) {
      describersBuilder(test)
    }
  }
}

main()