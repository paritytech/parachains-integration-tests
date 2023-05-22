const chai = require('chai');
var should = require('chai').should();
require('dotenv').config();
import { resolve } from 'path';
import { EventResult, Chain, Custom } from './interfaces';
import { addConsoleGroup, addConsoleGroupEnd, parseArgs } from './utils';
import { eventListenerBuilder } from './events';

const listenToEvents = async (context, events): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    let dummyChain: Chain = {
      wsPort: 0,
    };
    await eventListenerBuilder(context, dummyChain, events, resolve, reject);
  });
};

export const customBuilder = async (context, custom: Custom) => {
  const { path, args, events } = custom;
  let parsedArgs = parseArgs(context, args);
  let absolutePath = resolve(context.testPath, path);
  let customFunction;

  try {
    customFunction = await import(absolutePath);
  } catch (e) {
    console.log(`\n⛔ ERROR: no file can be found in ${path}`, e);
    process.exit(1);
  }

  if (typeof customFunction.default === 'function') {
    await customFunction.default(context, parsedArgs);

    let eventsResult: EventResult[] = [];

    if (events) {
      eventsResult = await listenToEvents(context, events);
    }

    addConsoleGroup(2);

    let fail;

    eventsResult.forEach((event) => {
      console.log(event.message);
      try {
        chai.assert.equal(event.ok, true, event.message);
      } catch (e) {
        fail = e;
      }
    });

    if (fail) {
      addConsoleGroupEnd(4);
      throw fail;
    }

    addConsoleGroupEnd(2);
  } else {
    console.log(
      `\n⛔ ERROR: a funcion must be default exported from the file ${path}`
    );
    process.exit(1);
  }
};
