const chai = require('chai');
var should = require('chai').should();
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const checkBalanceIncreased = async (context, ...args) => {
  const {
    balances: {
      before: {
        data: { free: before },
      },
      after: {
        data: { free: after },
      },
    },
    amount,
    fees
  } = args[0][0];

  let previousBalance = BigInt(before);
  let currentBalance = BigInt(after);

  let feesAmount = fees ?  BigInt(fees) : BigInt(0);
  let amountSent = amount ?  BigInt(amount) : BigInt(0);

  if (!fees && !amount) {
    new BN(currentBalance).should.be.a.bignumber.that.is.greaterThan(
      new BN(previousBalance)
    );
  } else {
    let expectedBalance = previousBalance + amountSent - feesAmount;
    new BN(currentBalance).should.be.a.bignumber.that.is.least(
      new BN(expectedBalance)
    );
  }
};

export default checkBalanceIncreased;
