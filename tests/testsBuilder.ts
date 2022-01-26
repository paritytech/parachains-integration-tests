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

const buildIt = (test) => {
    const { description, extrinsics } = test
  // return(
    it(
      description,
      function(done) {
        chai.assert.equal(true, true)
        done()
      }
    )
  // )  
}

const describeBuilder = async (tests) => {
  // return(async () => {
    // console.log("Test", test)
    // console.log("Desc", description)
    if(isObject(tests)) {
      for (const description of Object.keys(tests)) {
        // return(
          describe(description , async () => {
            // console.log(description)
            await describeBuilder(tests[description])
          })
          // )
        }  
      // )
    } else if(isArray(tests) && tests.length > 0) {
        for (const test of tests) {
                  // break;
          buildIt(test)
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
    describeBuilder(tests)
  }
  // it(
  //   'should NOT create the asset',
  //   function(done) {
  //     chai.assert.equal(true, true)
  //     done()
  //   })
// })

