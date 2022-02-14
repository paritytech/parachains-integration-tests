const chai = require('chai');
var should = require('chai').should()

const myAssert = async (context, tab, ...args) => {
  console.log(`${tab}Custom assert`)

  chai.assert.equal(true, true)

}

export default myAssert