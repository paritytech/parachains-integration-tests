import _ from 'lodash';
import YAML from 'yaml';
import glob from 'glob';
import fs from 'fs';
import traverse from 'traverse';
import { resolve, dirname } from 'path';
import { u8aToHex, compactAddLength, compactStripLength } from '@polkadot/util';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import {
  Extrinsic,
  TestFile,
  TestsConfig,
  PaymentInfo,
  Range,
} from './interfaces';
import { KeyringPair } from '@polkadot/keyring/types';

export const getTestFiles = (path): TestFile[] => {
  console.log(resolve(process.cwd(), path));

  let testsFiles;

  try {
    let absolutePath = resolve(process.cwd(), path);

    if (fs.lstatSync(absolutePath).isFile()) {
      testsFiles = [absolutePath];
    } else if (fs.lstatSync(absolutePath).isDirectory()) {
      testsFiles = glob.sync('/**/*.{yml,yaml}', { root: path });
    }

    return (testsFiles = testsFiles.map((testFile) => {
      let testPath = resolve(process.cwd(), testFile);

      let testDir = dirname(testPath);

      let file = fs.readFileSync(testFile, 'utf8');

      // Parse args to satisfy yaml specification (no nested [] allowed within flow sequence)
      file = file.replace(/(?<=args\s*:\s*\[)(.*)(?=])/gi, (match) => {
        if (!match.includes('[')) return match;
        return match.split(',').map(arg => {
          // Ignore if argument does not contain [] or is already wrapped in ''/""
          if (!arg.includes('[')) return arg;
          arg = arg.trim();
          return ((arg.startsWith('\'') && arg.endsWith('\'')) || (arg.startsWith('"') && arg.endsWith('"')))
              ? arg
              : `'${arg.trim()}'`; // wrap value containing [] in ''
        }).join(',');
      });

      let yaml: TestsConfig = YAML.parse(file);
      let test: TestFile = { name: testFile, dir: testDir, yaml };
      return test;
    }));
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

/**
 * @name stripUpperByte
 * @summary Strips upper byte
 */
export const stripUpperByte = (value: Uint8Array): Uint8Array => {
  return value.slice(1);
};

/**
 * @name stripEncodingDetails
 * @summary Strips encoded details
 * @description
 * Strips encoded details which contains the compact length of the following bytes and 1 byte with
 * a signed or non-signed flag (1 bit) and a protocol version number (7 bits).
 * @param extrinsic encoded extrinsic with an encoding details
 * @returns encoded extrinsic without an encoding details
 */
export const stripEncodingDetails = (extrinsic: Uint8Array): Uint8Array => {
  return stripUpperByte(compactStripLength(extrinsic)[1]);
};

export const buildEncodedCall = (context, decodedCall: Extrinsic) => {
  let dispatchable = buildDispatchable(context, decodedCall);
  return u8aToHex(compactAddLength(stripEncodingDetails(dispatchable.toU8a())));
};

export const buildEncodedCallHex = (context, decodedCall: Extrinsic) => {
  let dispatchable = buildDispatchable(context, decodedCall);
  return u8aToHex(stripEncodingDetails(dispatchable.toU8a()));
};

export const buildDispatchable = (context, extrinsic: Extrinsic) => {
  const { chain, sudo, pallet, call, args } = extrinsic;

  let providers = context.providers;
  let api = providers[chain.wsPort].api;

  let parsedArgs = parseArgs(context, args);

  let dispatchable = api.tx[pallet][call](...parsedArgs);

  if (sudo === true) {
    dispatchable = api.tx.sudo.sudo(dispatchable);
  }
  return dispatchable;
};

export const getPaymentInfoForExtrinsic = async (
  context,
  extrinsic: Extrinsic
): Promise<PaymentInfo> => {
  const { signer } = extrinsic;

  let dispatchable = buildDispatchable(context, extrinsic);
  let wallet = await getWallet(signer);

  return await dispatchable.paymentInfo(wallet);
};

export const getWallet = async (
  uri: string
): Promise<
  | KeyringPair
  | {
      address: any;
      addressRaw: Uint8Array;
    }
> => {
  if (uri.substring(0, 2) === '//') {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    return keyring.addFromUri(uri);
  } else {
    return { address: uri, addressRaw: decodeAddress(uri) };
  }
};

export const parseArgs = (context, args): any[] => {
  if (args.length == 0) return args;

  let variables = context.variables;
  if (variables) {
    // Check args for variables requiring value resolution
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === 'string') {
        // Check context variables for matching arguments
        const arg = args[i];
        for (const key of Object.keys(variables)) {
          if (arg.startsWith(key)) {
            // Resolve value based on argument
            let value = _.get(variables, arg);

            // Check whether value was resolved
            if (_.isUndefined(value)) {
              console.log(`\n⛔ ERROR: no value was found for the variable "${arg}".`);
              process.exit(1);
            }
            else if (!_.isNull(value)) {
              if (value.__UIntType) value = Number(value); // Auto-convert to number (if applicable)
              else if (value.initialU8aLength) value = value.toString(); // Use string representation of bytes (address)
            }

            // Replace argument with value
            args[i] = value;
            break;
          }
        }
      }

      // Automatically convert all large number arguments to BigInt
      if (typeof args[i] === 'number' && args[i] > Number.MAX_SAFE_INTEGER)
        args[i] = BigInt(args[i])
    }
  }

  // Check for any remaining unprocessed variables
  let unprocessed = args.filter(arg => typeof arg === 'string' && arg.startsWith('$'));
  if (unprocessed.length > 0)
  {
    const many = unprocessed.length > 1;
    console.log(
        `\n⛔ ERROR: no value was found for the variable${many ? 's' : ''} "${unprocessed}". ` +
        `Check that the action where ${many ? 'they are' : 'it is'} declared was not skipped after a failing assert.`
    );
    process.exit(1);
  }

  return args;
};

export const waitForChainToProduceBlocks = async (provider): Promise<void> => {
  return new Promise(async (resolve) => {
    const unsubHeads = await provider.api.rpc.chain.subscribeNewHeads(
      (lastHeader) => {
        if (lastHeader.number >= 1) {
          unsubHeads();
          resolve();
        } else {
          console.log(
            `\n⏳ Waiting for the chain '${provider.name}' to produce blocks...\n`
          );
        }
      }
    );
  });
};

export const updateLastBlocks = async (context) => {
  const { providers } = context;

  for (const [chain, _] of Object.entries(providers)) {
    const signedBlock = await providers[chain].api.rpc.chain.getBlock();
    providers[chain].lastBlock = signedBlock.block.header.number
      .toHuman()
      .replace(/,/g, '');
  }
};

export const addConsoleGroup = (depth: number) => {
  for (let i = 0; i < depth; i++) {
    console.group();
  }
};

export const addConsoleGroupEnd = (depth: number) => {
  for (let i = 0; i < depth; i++) {
    console.groupEnd();
  }
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const adaptUnit = (value: any): any => {
  let adapted = traverse(value).map(function (this, v) {
    if (typeof v === 'number') {
      this.update(v.toLocaleString());
    }
  });

  return adapted;
};

export const parseRange = (value: string): Range => {
  let range = value.split('..');

  try {
    let rightLen = range.length === 2;
    let lowerLimit = BigInt(range[0].replace(/,/g, ''));
    let upperLimit = BigInt(range[1].replace(/,/g, ''));

    if (rightLen) {
      return { valid: true, lowerLimit, upperLimit };
    } else {
      throw '';
    }
  } catch (e) {
    return { valid: false, lowerLimit: BigInt(0), upperLimit: BigInt(0) };
  }
};

export const withinRange = (value: string, data: string): boolean => {
  const { valid, upperLimit, lowerLimit }: Range = parseRange(value);

  if (valid) {
    try {
      let dataNumber = BigInt(data.replace(/,/g, ''));
      return dataNumber >= lowerLimit && dataNumber <= upperLimit;
    } catch (e) {
      console.log(
        `\n⛔ ERROR: expected event value result to be a number, got '${data}'`
      );
      return false;
    }
  } else {
    console.log(`\n⛔ ERROR: invalid Range value format '${value}'`);
    process.exit(1);
  }
};

export const buildRangeFromThreshold = (
  value: string,
  threshold: [number, number]
): string => {
  let valueInt: number;

  try {
    valueInt = Number(BigInt(value));
  } catch (e) {
    console.log(
      `\n⛔ ERROR: invalid 'value': ${value}, it should be a number -> ${e}`
    );
    process.exit(1);
  }

  let lowerLimit =
    Number(valueInt) * (Number(BigInt(threshold[0])) / Number(BigInt(100)));
  let upperLimit =
    Number(valueInt) * (Number(BigInt(threshold[0])) / Number(BigInt(100)));

  lowerLimit = Math.round(valueInt - lowerLimit);
  upperLimit = Math.round(valueInt + upperLimit);

  return lowerLimit + '..' + upperLimit;
};

export const parseThreshold = (
  value: string,
  threshold: [number, number]
): string => {
  if (threshold[0] >= 0 && threshold[1] >= 0) {
    return buildRangeFromThreshold(value, threshold);
  } else {
    console.log(
      `\n⛔ ERROR: invalid Threshold value format '${threshold}', upper and lower limit should be numbers bigger than 0`
    );
    process.exit(1);
  }
};

export const withinThreshold = (
  value: string | number,
  data: string,
  threshold: [number, number]
): boolean => {
  let range = parseThreshold(adaptUnit(value).replace(/,/g, ''), threshold);
  return withinRange(range, data);
};
