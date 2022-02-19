// const chai = require('chai');
var should = require('chai').should()

const checkBalances = async (context, ...args) => {
  console.log(JSON.stringify(args[0], null, 2))
}

export default checkBalances