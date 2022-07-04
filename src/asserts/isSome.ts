const chai = require('chai');
var should = require('chai').should();

const checkIsSome = async (context, ...args) => {
  let asset = args[0][0];

  let assetExist = asset ? true : false;

  chai.assert.equal(assetExist, true);
};

export default checkIsSome;
