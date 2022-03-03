import YAML from "yaml"
import glob from "glob";
import fs from "fs";
import traverse from 'traverse'
import { resolve , dirname } from "path";
import { u8aToHex, compactAddLength } from '@polkadot/util';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import { Extrinsic, TestFile, TestsConfig, PaymentInfo } from './interfaces';

export const getTestFiles = (path): TestFile[] => {
  console.log(resolve(process.cwd(), path))

  let testsFiles

  try { 
    let absolutePath = resolve(process.cwd(), path)

    if (fs.lstatSync(absolutePath).isFile()) {
      testsFiles = [absolutePath]
    } else if (fs.lstatSync(absolutePath).isDirectory()) {
      testsFiles = glob.sync('/**/*.{yml,yaml}', { root: path })
    }

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

export const buildEncodedCall = (context, decodedCall: Extrinsic) => {
  let dispatchable = buildDispatchable(context, decodedCall)
  return u8aToHex(compactAddLength(dispatchable.toU8a().slice(2)))
}

export const buildEncodedCallHex = (context, decodedCall: Extrinsic) => {
  let dispatchable = buildDispatchable(context, decodedCall)
  return u8aToHex((dispatchable).toU8a().slice(2))
}

export const buildDispatchable = (context, extrinsic: Extrinsic) => {
  const { chain, sudo, pallet, call, args } = extrinsic

  let providers = context.providers
  let api = providers[chain.wsPort].api

  let parsedArgs = parseArgs(context, args)

  let dispatchable = api.tx[pallet][call](...parsedArgs)

  if (sudo === true) {
    dispatchable = api.tx.sudo.sudo(dispatchable)
  }
  return dispatchable
}

export const getPaymentInfoForExtrinsic = async (context, extrinsic: Extrinsic): Promise<PaymentInfo> => {
  const { signer } = extrinsic

  let dispatchable = buildDispatchable(context, extrinsic)
  let wallet = await getWallet(signer)

  return await dispatchable.paymentInfo(wallet)
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
          strigifiedArg = strigifiedArg.replace(regex, `"${replacement}"`);
        } else if (typeof replacement === "number" ) {
          strigifiedArg = strigifiedArg.replace(regex, `${replacement}`);
        } else if (typeof replacement === "object") {
          strigifiedArg = strigifiedArg.replace(regex, `${JSON.stringify(replacement)}`);
        }
        i=-1
      }
    }
  }

    traverse(JSON.parse(strigifiedArg)).map(function (this, value) {
      let pattern = /\$/
      let regex = new RegExp(pattern, 'g')

      if (typeof value === 'string' && value.match(regex)) {
        console.log(`\n⚠️  WARNING: no value was found for the variable "${value}". Check that the action where it is declared was not skipped after a failing assert`)
      } 
  })
  return JSON.parse(strigifiedArg)
}

export const waitForChainToProduceBlocks = async (provider): Promise<void> => {
  return new Promise(async resolve => {
    const unsubHeads = await provider.api.rpc.chain.subscribeNewHeads((lastHeader) => {
      if (lastHeader.number >= 1) {
        unsubHeads();
        resolve()
      } else {
        console.log(`\n⏳ Waiting for the chain '${provider.name}' to produce blocks...\n`)
      }
    });
  })
}

export const addConsoleGroup = (depth: number) => {
  for (let i = 0; i < depth; i++){
    console.group()
  }
}

export const addConsoleGroupEnd = (depth: number) => {
  for (let i = 0; i < depth; i++){
    console.groupEnd()
  }
}

export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}
