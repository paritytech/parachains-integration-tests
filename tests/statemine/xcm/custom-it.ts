const chai = require('chai');
var should = require('chai').should()

const myIt = async (context, ...args) => {
  console.log(`Custom it ${args[0]}`)
  chai.assert.equal(true, true)
}

export default myIt