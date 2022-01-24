require('dotenv').config()
const chai = require('chai');
var should = require('chai').should()
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
import {
  getBalance,
  getLaunchConfig,
  buildEncodedCall
} from '../../src/common'
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
  beforeConnectToProviders,
  sleep
} from "../../src/common/test"
import { numberToHex } from '@polkadot/util'

const AMOUNT = 1000000000
const SENDER_RELAY = "//Alice"
const RECEIVER_PARA = "//Charlie"
const SENDER_PARA = "//Alice"
const RECEIVER_RELAY = "//Bob"
const SOVEREIGN_ACCOUNT = "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM"
const REQUIRED_WEIGHT_AT_MOST = 1000000000
const STORAGE_KEY = "0xb422898ac3ef83da3f78bdf77b08a2169a04835360230ca16c5d96970a47e370"

describe('Send - Transact', () => {

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

  describe('DMP', () => {
    describe('Origin Type - SovereignAccount - Transfer Balance', async () => {

      // Only SUDO Account is able to send a Transact XCM to a Parachain
      // The Call will be dispatched by the Sovereign account in the Parachain, which is 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM or
      // public key: 0x0000000000000000000000000000000000000000000000000000000000000000
      // Thus, the Sovereign Account should have some balance
      before(async function() {
        let nonce = await this.paraSourceApi.rpc.system.accountNextIndex(this.senderRelay.address);

        await this.paraSourceApi.tx.balances.transfer(
          SOVEREIGN_ACCOUNT,
          AMOUNT * 2
          ).signAndSend(this.senderRelay, { nonce }, async ({ events = [], status }) => {
            if (status.isInBlock) {
              this.sovereignAccountBalance = await getBalance(this.paraSourceApi, SOVEREIGN_ACCOUNT)
            }
          });
        
        // Call to be dispatch in the Parachain -> Transfer AMOUNT Balance to SENDER_PARA
        let call = this.paraSourceApi.tx.balances.transfer(this.receiverPara.address, AMOUNT)
        this.encodedCall = await buildEncodedCall(call);
        // We make sure the balance is updated before testing
        await sleep(MS_WAIT_FOR_UPDATE)
      })

      it(
        'should execute successfuly the Outbound XCM in the Relay Chain & the Inbound XCM in the Parachain',
        async function() {
          let results = await Promise.all([
            shouldExecuteOutboundXcm(
              `yarn dev dmp local transact -s ${SENDER_RELAY} -p ${this.paraId} -t SovereignAccount -w ${REQUIRED_WEIGHT_AT_MOST} -c ${this.encodedCall}`
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
  
      it(
        'should decrease balance in Sovereign Account Parachain account equal to the amount', 
        async function() {
          // We make sure the balance is updated before testing
          await sleep(MS_WAIT_FOR_UPDATE)
    
          let newBalance = await getBalance(this.paraSourceApi, SOVEREIGN_ACCOUNT)
          let expectedBalance = this.sovereignAccountBalance.toBn().sub(new BN(AMOUNT))
          
          newBalance.toBn().should.be.a.bignumber.that.is.eq(expectedBalance)
      })
  
      it(
        'should increase balance in receiver Parachain account equal to the amount', 
        async function() {
          // We make sure the balance is updated before testing
          await sleep(MS_WAIT_FOR_UPDATE)
    
          let newBalance = await getBalance(this.paraSourceApi, this.receiverPara.address)
          let expectedBalance = this.receiverParaBalance.toBn().add(new BN(AMOUNT))
    
          newBalance.toBn().should.be.a.bignumber.that.is.eq(expectedBalance)
      })
    });

    describe('Origin Type - Superuser - Set Storage', async () => {
      // xxHash(Test) 0xb422898ac3ef83da3f78bdf77b08a216 + xxHash(set_storage) 0x9a04835360230ca16c5d96970a47e370
      // Key 0xb422898ac3ef83da3f78bdf77b08a2169a04835360230ca16c5d96970a47e370
      // Encoded call = 0x00060480b422898ac3ef83da3f78bdf77b08a2169a04835360230ca16c5d96970a47e3701002000000

      before(async function() {
        // Generate a random value to store
        let random = Math.floor((Math.random() * 100) + 1);
        this.storageValue = numberToHex(random, 32)
        let call = this.paraSourceApi.tx.system.setStorage([[STORAGE_KEY, this.storageValue]])
        this.encodedCall = await buildEncodedCall(call);
      })

      it(
        'should execute successfuly the Outbound XCM in the Relay Chain & the Inbound XCM in the Parachain',
        async function() {
          let results = await Promise.all([
            shouldExecuteOutboundXcm(
              `yarn dev dmp local transact -s ${SENDER_RELAY} -p ${this.paraId} -t Superuser -w ${REQUIRED_WEIGHT_AT_MOST} -c ${this.encodedCall}`
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

      it('should set storage', async function() {
        await sleep(MS_WAIT_FOR_UPDATE)
        let storageValue = await this.paraSourceApi.rpc.state.getStorage(STORAGE_KEY)

        chai.assert.equal(storageValue.toHuman(), this.storageValue)
      });
    })
  })

  describe('UMP', () => {
    // xxHash(Test) 0xb422898ac3ef83da3f78bdf77b08a216 + xxHash(set_storage) 0x9a04835360230ca16c5d96970a47e370
    // Key 0xb422898ac3ef83da3f78bdf77b08a2169a04835360230ca16c5d96970a47e370
    // Encoded call = 0x00060480b422898ac3ef83da3f78bdf77b08a2169a04835360230ca16c5d96970a47e3701002000000

    before(async function() {
      // Generate a randome value to store
      let random = Math.floor((Math.random() * 100) + 1);
      this.storageValue = numberToHex(random, 32)
      let call = this.paraSourceApi.tx.system.setStorage([[STORAGE_KEY, this.storageValue]])
      this.encodedCall = await buildEncodedCall(call);
    })

    it(
      'should execute successfuly the Outbound XCM in the Relay Chain & the Inbound XCM in the Parachain',
      async function() {
        let results = await Promise.all([
          shouldExecuteOutboundXcm(
            `yarn dev ump local transact -s ${SENDER_RELAY} -p ${this.paraId} -t Superuser -w ${REQUIRED_WEIGHT_AT_MOST} -c ${this.encodedCall}`
          ), 
          shouldExecuteInboundXcm(this.relaySourceApi, ump.ExecutedUpward)
        ])

        results.forEach(({ result, type }) => {
          if (type === 'outbound') {
            chai.assert.equal(eventResultParser(result), OK)
          } else if (type === 'inbound') {
            chai.assert.equal(result, 'FAIL-ump.ExecutedUpward-{"error":{"barrier":null}}')
          }
        })
    });
  });
});