const chai = require('chai');
var should = require('chai').should();
import { addConsoleGroupEnd } from '../utils';

const checkIsSome = async (context, ...args) => {
  let asset = args[0][0];

  let assetExist = asset ? true : false;
  let fail;

  try {
    chai.assert.equal(assetExist, true);
  } catch (e) {
    fail = e;
  }
};

export default checkIsSome;
