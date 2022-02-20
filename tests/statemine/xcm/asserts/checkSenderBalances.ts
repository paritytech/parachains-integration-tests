const chai = require('chai');
var should = require('chai').should()
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const checkSenderBalances = async (context, ...args) => {
  console.log("checkSenderBalances", args[0])

  const {
    balances: 
      {
          before: { data: { free: senderBefore } }, 
          after: { data: { free: senderAfter } }
      },  
    amount
  } = args[0]
  
  // console.log("Sender BEFORE", senderBefore.toBn())
  console.log("Sender AFTER", BigInt(senderAfter))
  let amountSent = BigInt(amount)
  let previousBalance = BigInt(senderBefore)
  let currentBalance = BigInt(senderAfter)
  let expectedBalance = previousBalance - amountSent

  // let balanceChange = senderBefore.sub(senderAfter)
  
  // Assert
  chai.assert.equal(true, currentBalance < expectedBalance)
  // chai.assert.equal(balanceChange, new BN(amount))
  // console.log(JSON.stringify(args[0], null, 2))
}

export default checkSenderBalances

// 999,984,998,281,811,445 before
// 999,983,998,167,385,021 