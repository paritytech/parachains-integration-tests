const chai = require('chai');
var should = require('chai').should();
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));

const checkValueDecreased = async (context, ...args) => {
    const {
        before,
        after,
    } = args[0][0];

    let previousValue = BigInt(before);
    let currentValue = BigInt(after);

    new BN(currentValue).should.be.a.bignumber.that.is.lessThan(
        new BN(previousValue)
    );
};

export default checkValueDecreased;
