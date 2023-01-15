const chai = require('chai');
var should = require('chai').should();
import { addConsoleGroupEnd } from '../utils';

const checkIsNone = async (context, ...args) => {
  let asset = args[0][0];

  let assetExist = asset ? true : false;
  let fail;

  try {
    chai.assert.equal(assetExist, false);
  } catch (e) {
    fail = e;
  }

  if (fail) {
    addConsoleGroupEnd(2);
    throw fail;
  }
};

export default checkIsNone;
