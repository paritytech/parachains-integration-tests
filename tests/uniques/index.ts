require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
import { OK } from '../../src/config'
import { 
  eventResultParser,
  beforeConnectToProviders
} from "../../src/common/test"
const { exec } = require("child_process");
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const SENDER_RELAY = "//Alice"
const RECEIVER_PARA = "//Bob"
const SENDER_PARA = "//Alice"
const RECEIVER_RELAY = "//Bob"
const ADMIN = '//Eve'
const UNIQUE_INSTANCE = 1

describe('Uniques', () => {
  
  beforeConnectToProviders(
    { 
      relay: { senderRelay: SENDER_RELAY, receiverRelay: RECEIVER_RELAY },
      para: { senderPara: SENDER_PARA, receiverPara: RECEIVER_PARA }
    }  
  )

  before(async function () {
    const getClassId = async () => {
      let exists
      let classId

      do {
        classId = Math.floor((Math.random() * 100) + 1);
        exists = await this.paraSourceApi.query.uniques.class(classId)
      } while (exists.isSome)
      
      return classId
    }

    this.classId = await getClassId()
  })

  describe('Create', () => {
    it(
      'should create the unique',
      function(done) {
        exec(
          `yarn dev:uniques:create -i ${this.classId} -a ${ADMIN} -s ${ADMIN}`, 
          (error, stdout, stderr) => {
            if (stdout) {
              console.log(stdout)
              let result = eventResultParser(stdout)
              chai.assert.equal(result, OK)
              done()
            }
        });
    });
  });

  describe('Mint', () => {
    it(
      'should issue uniques',
      function(done) {
        exec(
          `yarn dev:uniques:mint -i ${this.classId} -t ${UNIQUE_INSTANCE} -o ${ADMIN} -s ${ADMIN}`, 
          (error, stdout, stderr) => {
            if (stdout) {
              console.log(stdout)
              let result = eventResultParser(stdout)
              chai.assert.equal(result, OK)
              done()
            }
        });
    });
  });

  describe('Transfer', () => {
    it(
      'should transfer uniques',
      function(done) {
        exec(
          `yarn dev:uniques:transfer -i ${this.classId} -t ${UNIQUE_INSTANCE} -d ${RECEIVER_PARA} -s ${ADMIN}`, 
          (error, stdout, stderr) => {
            if (stdout) {
              console.log(stdout)
              let result = eventResultParser(stdout)
              chai.assert.equal(result, OK)
              done()
            }
        });
    });
  });
});