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

const EVENT_LISTENER_TIMEOUT = 50000

const isObject = (variable) => {
  return (
    typeof variable === 'object' &&
    !Array.isArray(variable) &&
    variable !== null
  )  
}

const isArray = (variable) => {
  return variable.constructor === Array
}

const listenToEvent = async (providers, event): Promise<any> => {
  return new Promise(async resolve => {
    // console.log('Waiting for the Event...\n')

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
              if (data.toString() === value.toString()) {
                resolve({ ok: true, message: `\n\t✅ EVENT: ${name} received with ${type}: ${value}` });
              } else {
                resolve({ ok: false, message: `\n\t❌ EVENT: ${name} received with different value - Expected: ${type}: ${value}, Received: ${type}: ${data}` });
              }
              unsubscribe()
            }
          });
        }
      });
    });
    
    setTimeout(() => { 
        unsubscribe()
        resolve({ ok: false, message: `\n\t❌ EVENT: ${name} never reveived - TIMEOUT` });
    }, EVENT_LISTENER_TIMEOUT)  
  })
}

const sendExtrinsic = async (providers, extrinsic): Promise<any> => {
  return new Promise(async resolve => {
    const { chain, signer, pallet, call, args, events } = extrinsic

    let api = providers[chain].api
    let wallet = await getWallet(signer)

    let nonce = await api.rpc.system.accountNextIndex(wallet.address);

    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 }
    );

    resolve(`📩 EXTRINSIC: ${pallet}.${call} with ${args}`)
  })
}

const extrinsicsBuilder = async (extrinsics, providers) => {
  for (const extrinsic of extrinsics) {
    const { events } = extrinsic

    let extrinsicPromise = sendExtrinsic(providers, extrinsic)

    let eventsPromises = events.map(event => {
      return listenToEvent(providers, event)
    })

    // console.log("Event Promises", eventsPromises)
    // console.log("Promises", [extrinsicPromise, ...eventsPromises])

    let results = await Promise.all([extrinsicPromise, ...eventsPromises])

    let extrinsicResult = results.shift()
    console.log(extrinsicResult)

    // console.log("Results", results)

    results.forEach(event => {
      try {
        chai.assert.equal(event.ok, true)
      } catch(err) {
        console.log(event.message)
        throw ''
      }
      console.log(event.message)
    });
  }
}

const itsBuilder = (test) => {
  const { description, extrinsics } = test

  it(
    description,
    async function() {
      await extrinsicsBuilder(extrinsics, this.providers)
    }
  )
}

const describersBuilder = async (tests) => {
  if(isObject(tests)) {
    for (const description of Object.keys(tests)) {
        describe(description , async () => {
          await describersBuilder(tests[description])
        })
      }  
  } else if(isArray(tests) && tests.length > 0) {
      for (const test of tests) {
        itsBuilder(test)
      }
  }
}

const main = async () => {
  beforeConnectToProviders()

  for (const testsConfig of getTestsConfig()) {
    for (const test of testsConfig.tests) {
      await describersBuilder(test)
    }
  }
}

main()