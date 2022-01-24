require('dotenv').config()
const chai = require('chai');
import { OK, FAIL } from '../../src/config'
import { 
  beforeConnectToProviders,
  eventResultParser
} from "../../src/common/test";
const { exec } = require("child_process");
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const AMOUNT = 1000000000000
const SENDER_RELAY = "//Alice"
const RECEIVER_PARA = "//Bob"
const SENDER_PARA = "//Alice"
const RECEIVER_RELAY = "//Bob"
const MIN_BALANCE = 1000
const ADMIN = '//Charlie'
const DECIMALS = 12
const ASSET_NAME = 'NachoCoin'
const ASSET_SYMBOL = 'NC'
const SUDO = "//Alice"

beforeConnectToProviders(
  { 
    relay: { senderRelay: SENDER_RELAY, receiverRelay: RECEIVER_RELAY },
    para: { senderPara: SENDER_PARA, receiverPara: RECEIVER_PARA }
  }  
)

describe('Assets', () => {

  before(async function () {
    const getAssetId = async () => {
      let exists
      let assetId

      do {
        assetId = Math.floor((Math.random() * 100) + 1);
        exists = await this.paraSourceApi.query.assets.asset(assetId)
      } while (exists.isSome)
      
      return assetId
    }

    this.assetId = await getAssetId()
  })

  describe('Create', () => {
    it(
      'should NOT create the asset',
      function(done) {
        exec(
          `yarn dev:assets:create -i ${this.assetId} -a ${ADMIN} -m ${MIN_BALANCE} -s ${ADMIN}`, 
          (error, stdout, stderr) => {
            if (stdout) {
              console.log(stdout)
              let result = eventResultParser(stdout)
              chai.assert.equal(result, FAIL)
              done()
            }
        });
    });
  });

  describe('Set Metadata', () => {
    it(
      'should set metadata for asset',
      function(done) {
        exec(
          `yarn dev:assets:set-metadata -i ${this.assetId} -n ${ASSET_NAME} -y ${ASSET_SYMBOL} -d ${DECIMALS} -s ${ADMIN}`, 
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
      'should issue assets',
      function(done) {
        exec(
          `yarn dev:assets:mint -i ${this.assetId} -b ${ADMIN} -a ${AMOUNT} -s ${ADMIN}`, 
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
      'should transfer assets',
      function(done) {
        exec(
          `yarn dev:assets:transfer -i ${this.assetId} -t ${RECEIVER_PARA} -a ${AMOUNT} -s ${ADMIN}`, 
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

describe('Assets Tx Payments', () => {

  before(async function () {
    const getAssetId = async () => {
      let exists
      let assetId

      do {
        assetId = Math.floor((Math.random() * 100) + 1);
        exists = await this.paraSourceApi.query.assets.asset(assetId)
      } while (exists.isSome)
      
      return assetId
    }

    this.assetId = await getAssetId()
  })

  describe('Force Create', () => {
    it(
      'should force create the asset',
      function(done) {
        exec(
          `yarn dev:assets:force-create -i ${this.assetId} -o ${SUDO} -u -m ${MIN_BALANCE} -s ${SUDO}`, 
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
      'should issue assets',
      function(done) {
        exec(
          `yarn dev:assets:mint -i ${this.assetId} -b ${SUDO} -a ${AMOUNT} -s ${SUDO}`, 
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
      'should transfer assets',
      function(done) {
        exec(
          `yarn dev:assets:transfer -i ${this.assetId} -t ${RECEIVER_PARA} -a ${AMOUNT} -s ${SUDO}`, 
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
})