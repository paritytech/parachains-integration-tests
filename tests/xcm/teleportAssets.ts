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
  beforeConnectToProviders,
  shouldExecuteInboundXcm,
  shouldExecuteOutboundXcm,
  sleep
} from "../../src/common/test"
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const AMOUNT = 1000000000000
const SENDER_RELAY = "//Alice"
const RECEIVER_PARA = "//Charlie"
const SENDER_PARA = "//Alice"
const RECEIVER_RELAY = "//Bob"
const ASSET_ID = 0

describe('Limited Teleport Assets', () => {
  
  beforeConnectToProviders(
    { 
      relay: { senderRelay: SENDER_RELAY, receiverRelay: RECEIVER_RELAY },
      para: { senderPara: SENDER_PARA, receiverPara: RECEIVER_PARA }
    }  
  )

  before(async function () {
    // let config = getLaunchConfig()
    // this.paraId = config.parachains[0].id
    this.paraId = await this.paraSourceApi.query.parachainInfo.parachainId();
  })

  describe('DMP', async () => {
    it(
      'should execute successfuly the Outbound XCM in the Relay Chain and the Inbound XCM in the Parachain', 
      async function() {
        let results = await Promise.all([
          shouldExecuteOutboundXcm(
            `yarn dev dmp local teleport-asset -s ${SENDER_RELAY} -p ${this.paraId} -b ${RECEIVER_PARA} -a ${AMOUNT} -f ${ASSET_ID}`
          ), 
          shouldExecuteInboundXcm(this.paraSourceApi, dmpQueue.ExecuteDownward)
        ])

        results.forEach(({ result, type }) => {
          if (type === 'outbound') {
            chai.assert.equal(eventResultParser(result), OK)
          } else if (type === 'inbound') {
            chai.assert.equal(eventResultParser(result), OK)
          }
        })
      });

    it('should decrease balance in sender Relay Chain account equal or greater than amount', async function() {
      // We make sure the balance is updated before testing
      await sleep(MS_WAIT_FOR_UPDATE)

      let newBalance = await getBalance(this.relaySourceApi, this.senderRelay.address)
      let expectedBalance = this.senderRelayBalance.toBn().sub(new BN(AMOUNT))
      
      newBalance.toBn().should.be.a.bignumber.that.is.lessThan(expectedBalance)
    })

    it('should increase balance in receiver Parachain account', async function() {
      // We make sure the balance is updated before testing
      await sleep(MS_WAIT_FOR_UPDATE)

      let newBalance = await getBalance(this.paraSourceApi, this.receiverPara.address)

      newBalance.toBn().should.be.a.bignumber.that.is.greaterThan(this.receiverParaBalance)
    })
  });

  describe('UMP', async () => {
    it(
      'should execute successfuly the Outbound XCM in the Parachain & the Inbound XCM in the Relay Chain',
      async function() {
        let results = await Promise.all([
          shouldExecuteOutboundXcm(
            `yarn dev ump local teleport-asset -s ${SENDER_PARA} -p ${this.paraId} -b ${RECEIVER_RELAY} -a ${AMOUNT} -f ${ASSET_ID}`
          ), 
          shouldExecuteInboundXcm(this.relaySourceApi, ump.ExecutedUpward)
        ])

        results.forEach(({ result, type }) => {
          if (type === 'outbound') {
            chai.assert.equal(eventResultParser(result), OK)
          } else if (type === 'inbound') {
            chai.assert.equal(eventResultParser(result), OK)
          }
        })
      });

    it('should decrease balance in sender Parachain account equal or greater than amount', async function() {
      // We make sure the balance is updated before testing
      await sleep(MS_WAIT_FOR_UPDATE)

      let newBalance = await getBalance(this.paraSourceApi, this.senderPara.address)
      let expectedBalance = this.senderRelayBalance.toBn().sub(new BN(AMOUNT))
      
      newBalance.toBn().should.be.a.bignumber.that.is.lessThan(expectedBalance)
    })

    it('should increase balance in receiver Relay Chain account', async function() {
      // We make sure the balance is updated before testing
      await sleep(MS_WAIT_FOR_UPDATE)

      let newBalance = await getBalance(this.relaySourceApi, this.receiverRelay.address)

      newBalance.toBn().should.be.a.bignumber.that.is.greaterThan(this.receiverRelayBalance)
    })
  });
});