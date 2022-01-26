require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import {
  beforeConnectToProviders,
  eventResultParser
} from "../src/common/test";
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  getTestsConfig,
  getBalance,
  getApisFromRelays,
  buildEncodedCall
} from '../src/common';

let config = getLaunchConfig()
let testsConfig = getTestsConfig()

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

const evalsBuilder = async (evals) => {
  
}

const extrinsicsBuilder = async (extrinsics, providers) => {
  for (const extrinsic of extrinsics) {
    const { chain, signer, pallet, call, args } = extrinsic
    let api = providers[chain].api
    let wallet = await getWallet(signer)

    let nonce = await api.rpc.system.accountNextIndex(wallet.address);
    await providers[chain].api.tx[pallet][call](...args).signAndSend(
      wallet, 
      { nonce, era: 0 }
    );
  }
}

const itsBuilder = (test) => {
    const { description, extrinsics, evals } = test
  // return(
    it(
      description,
      function(done) {
        extrinsicsBuilder(extrinsics, this.providers)
        evalsBuilder(evals)
        chai.assert.equal(true, true)
        done()
      }
    )
  // )  
}

const describersBuilder = async (tests) => {
  // return(async () => {
    // console.log("Test", test)
    // console.log("Desc", description)
    if(isObject(tests)) {
      for (const description of Object.keys(tests)) {
        // return(
          describe(description , async () => {
            // console.log(description)
            await describersBuilder(tests[description])
          })
          // )
        }  
      // )
    } else if(isArray(tests) && tests.length > 0) {
        for (const test of tests) {
                  // break;
          itsBuilder(test)
        }
    }
  // }
  // )
}
  
// const build = async () => {
//   for (const test of testsConfig.tests) {
//     return( await describeBuilder(test)
//   }
// }

beforeConnectToProviders()

// describe('Integration Tests', () => {
  for (const tests of testsConfig.tests) { 
    describersBuilder(tests)
  }
  // it(
  //   'should NOT create the asset',
  //   function(done) {
  //     chai.assert.equal(true, true)
  //     done()
  //   })
// })

