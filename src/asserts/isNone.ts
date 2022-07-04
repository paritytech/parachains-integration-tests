const chai = require('chai');
var should = require('chai').should();

const checkIsNone = async (context, ...args) => {
  let asset = args[0][0];

  let assetExist = asset ? true : false;

  chai.assert.equal(assetExist, false);
};

export default checkIsNone;
