const chai = require('chai');

const checkIs42 = async (context, ...args) => {
  chai.assert.equal(args[0][0], 42);
};

export default checkIs42;
