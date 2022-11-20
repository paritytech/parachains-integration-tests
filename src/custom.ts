require('dotenv').config();
import { resolve } from 'path';
import { Custom } from './interfaces';
import { parseArgs } from './utils';

export const customBuilder = async (context, custom: Custom) => {
  const { path, args } = custom;
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
  } else {
    console.log(
      `\n⛔ ERROR: a funcion must be default exported from the file ${path}`
    );
    process.exit(1);
  }
};
