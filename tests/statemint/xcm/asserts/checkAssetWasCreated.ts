const chai = require('chai');
var should = require('chai').should()

const checkSenderBalances = async (context, ...args) => {
  let asset = args[0]

  let assetExist = asset ? true : false

  chai.assert.equal(assetExist, true)
  // console.log("Asset Created", args[0])
}

export default checkSenderBalances
