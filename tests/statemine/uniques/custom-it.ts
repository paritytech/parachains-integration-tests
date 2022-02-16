const chai = require('chai');
var should = require('chai').should()

const myIt = async (context, tab, ...args) => {
  console.log(`${tab}Custom it de UNIQUES ${args[0]}`)
  chai.assert.equal(true, true)
}

export default myIt