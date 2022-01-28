require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import { 
  getBalance,
  getLaunchConfig
} from '../../src/common';
import { 
  dmpQueue,
  ump,
  OK, 
  MS_WAIT_FOR_UPDATE 
} from '../../src/config'
import { 
  eventResultParser,
  shouldExecuteInboundXcm,
  shouldExecuteOutboundXcm,
  sleep
} from "../../src/common/test"
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));


before(() => {
  console.log("I do something BEFORE 0")
})

describe("Describe 1", () => {
  beforeEach(() => {
    console.log("I do something BEFORE EACH 1")
  })
  
  it("It 1", () => {
    chai.assert.equal(true,true)
  })

  describe("Describe 2", () => {
    before(() => {
      console.log("I do something BEFORE 2")
    })
    beforeEach(() => {
      console.log("I do something BEFORE EACH 2")
    })

    it("It 2", () => {
      chai.assert.equal(true,true)
    })
  })
})