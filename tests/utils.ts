import { resolve } from "path";
import fs from "fs";
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util'
import { Call } from './interfaces/test';
import { LaunchConfig } from "./interfaces/filesConfig";

export const getLaunchConfig = () => {
  const config_file = './config.json'

  if (!config_file) {
    console.error("Missing config file argument...");
    process.exit();
  }

  let config_path = resolve(process.cwd(), config_file);

  if (!fs.existsSync(config_path)) {
    console.error("Config file does not exist: ", config_path);
    process.exit();
  }

  let config: LaunchConfig = require(config_path);

  return config
}

export const buildEncodedCall = (context, decodedCall: Call) => {
  const { chain, pallet, call, args } = decodedCall
  let providers = context.providers
  let parsedArgs = parseArgs(context, args)

  let encodedCall = providers[chain].api.tx[pallet][call](...parsedArgs)

  return u8aToHex((encodedCall).toU8a().slice(2))
}

export const getWallet = async (uri) => {
  if (uri.substring(0,2) === '//') {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    return keyring.addFromUri(uri);
  }
  else {
    return { address: uri, addressRaw: decodeAddress(uri)}
  }
}

export const buildTab = (indent: number): string => {
  let array = indent > 0 ? new Array(indent).fill('    ') : ['    ']

  let tab = array.reduce((previous, current) => {
    return previous + current
  })

  return tab
}

export const parseArgs = (context, args): any[] => {
  let variables = context.variables
  let strigifiedArg = JSON.stringify(args)
  let keys = Object.keys(variables)

  for (let i=0; i < keys.length; i++) {
    let pattern = `"\\${keys[i]}"`
    let regex = new RegExp(pattern, 'g')
    if (strigifiedArg.match(regex)) {
      let replacement = variables[keys[i]]
      if (typeof replacement === "string") {
        strigifiedArg = strigifiedArg.replace(regex, `"${variables[keys[i]]}"`);
      } else if (typeof replacement === "number" ) {
        strigifiedArg = strigifiedArg.replace(regex, `${variables[keys[i]]}`);
      } else if (typeof replacement === "object") {
        strigifiedArg = strigifiedArg.replace(regex, `${JSON.stringify(variables[keys[i]])}`);
      }
      i=-1
    }
  }
  return JSON.parse(strigifiedArg)
}

