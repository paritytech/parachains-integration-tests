const chai = require('chai');
var should = require('chai').should()
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const checkReceiverBalances = async (context, ...args) => {
  console.log(args[0])

  const {
    balances: 
      { 
        before: { data: { free: receiverBefore } }, 
        after: { data: { free: receiverAfter } }
      },
    amount,
    fees
  } = args[0]
  // console.log("Before Data", args[0].balances.before.data)
  // console.log("After Data", args[0].balances.after.data)
  // console.log("Before Free", receiverBefore)
  // console.log("After Free", receiverAfter)
  
  let receivedAmount = new BN(amount)
  let previousBalance = new BN(receiverBefore)
  let currentBalance =  new BN(receiverAfter)
  let expectedBalance

  if (fees) {
    expectedBalance = previousBalance.add(receivedAmount).sub(new BN(fees))
    // Assert
    chai.assert.equal(currentBalance, expectedBalance)
  } else {
    expectedBalance = previousBalance.add(receivedAmount)
    // Assert
    currentBalance.should.be.a.bignumber.that.is.greaterThan(previousBalance)
  }
}

export default checkReceiverBalances