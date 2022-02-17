import YAML from "yaml"
import glob from "glob";
import fs from "fs";
import { resolve , dirname } from "path";
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util'
import { Call, TestFile, TestsConfig } from './interfaces';

export const addConsoleGroups = (depth: number) => {
  before(function () {
    for (let i = 0; i < depth; i++){
      console.group()
    }
  })

  after(function () {
    for (let i = 0; i < depth; i++){
      console.groupEnd()
    }
  })
}

export const buildTab = (indent: number): string => {
  let array = indent > 0 ? new Array(indent).fill('    ') : ['    ']

  let tab = array.reduce((previous, current) => {
    return previous + current
  })

  return tab
}

export const getTestFiles = (path): TestFile[] => {
  let testsFiles = glob.sync('/**/*.yml', { root: path })

  try {
    return testsFiles = testsFiles.map(testFile => {
      let testPath = resolve(process.cwd(), testFile);
      let testDir = dirname(testPath);
      const file = fs.readFileSync(testFile, 'utf8')
      let yaml: TestsConfig = YAML.parse(file)
      let test: TestFile = { name: testFile, dir: testDir, yaml }
      return test
    })
  } catch(e) {
    console.log(e)
    process.exit(1)
  }
}

export const buildEncodedCall = (context, decodedCall: Call) => {
  const { chain, pallet, call, args } = decodedCall

  let providers = context.providers
  let api = providers[chain.wsPort].api
  let parsedArgs = parseArgs(context, args)

  let encodedCall = api.tx[pallet][call](...parsedArgs)

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

export const parseArgs = (context, args): any[] => {
  let variables = context.variables
  let strigifiedArg = JSON.stringify(args)
  
  if (variables) {
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
  }
  
  return JSON.parse(strigifiedArg)
}

export const waitForChainToProduceBlocks = async (provider): Promise<void> => {
  return new Promise(async resolve => {
    const unsubHeads = await provider.api.rpc.chain.subscribeNewHeads((lastHeader) => {
      if (lastHeader.number >= 1) {
        unsubHeads();
        resolve()
      } else {
        console.log(`\n⏳ Waiting for the chain ${provider.name} to produce blocks...\n`)
      }
    });
  })
}

