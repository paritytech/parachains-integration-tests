const chai = require('chai');
var should = require('chai').should()

const myAssert = async (context, ...args) => {
  console.log(`Custom assert ${JSON.stringify(args)}`)

  chai.assert.equal(true, true)

}

export default myAssert