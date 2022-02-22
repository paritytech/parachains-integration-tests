const chai = require('chai');
var should = require('chai').should()
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const checkReceiverBalances = async (context, ...args) => {
  const {
    balances: 
      { 
        before: { data: { free: receiverBefore } }, 
        after: { data: { free: receiverAfter } }
      },
    amount,
    fees
  } = args[0]
  
  // let receivedAmount = new BN(amount)
  let previousBalance = new BN(receiverBefore)
  let currentBalance =  new BN(receiverAfter)

  // Assert
  currentBalance.should.be.a.bignumber.that.is.greaterThan(previousBalance)
}

export default checkReceiverBalances