require('dotenv').config();
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { TextDecoder } from 'util';
import { u8aToHex } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';
import { BuildBlockMode } from '@acala-network/chopsticks-core'
import {
  addConsoleGroup,
  addConsoleGroupEnd,
  buildEncodedCall,
  buildEncodedCallHex,
  updateLastBlocks,
  waitForChainToProduceBlocks,
} from './utils';
import { connectToProviders } from './connection';
import { TestFile, Chain, Runtime } from './interfaces';
import {
  DEFAULT_EVENT_LISTENER_TIMEOUT,
  DEFAULT_ACTION_DELAY,
  DEFAULT_TIMEOUT,
  DEFAULT_EVENT_LISTENER_TIMEOUT_CHOPSTICKS,
} from './constants';

const checkChains = (chains: {
  [key: string]: Chain;
}): { [key: string]: Chain } => {
  for (let id in chains) {
    if (!chains[id].ws) {
      chains[id].ws = 'ws://127.0.0.1';
    }
  }
  return chains;
};

const checkMode = async (provider): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      await provider.api.rpc('dev_setBlockBuildMode', [BuildBlockMode.Batch]);
    } catch (e) {
      return resolve("zombienet")
    }
    return resolve("chopsticks")
  });
}

export const beforeConnectToProviders = (testFile: TestFile) => {
  before(async function () {
    let timeout = process.env.TIMEOUT ? process.env.TIMEOUT : DEFAULT_TIMEOUT;
    this.timeout(timeout);
    let actionDelay = process.env.QUERY_DELAY;
    this.actionDelay = actionDelay ? actionDelay : DEFAULT_ACTION_DELAY;
    this.providers = {};
    this.testPath = testFile.dir;
    this.testName = testFile.name;

    let chains = testFile.yaml.settings.chains;
    chains = checkChains(chains);

    for (let name in chains) {
      console.log(`\n🔌 Connecting to '${name}'...\n`);
      this.providers[chains[name].wsPort] = await connectToProviders(
        chains[name]
      );
      this.providers[chains[name].wsPort].mode = await checkMode(this.providers[chains[name].wsPort]);
      let eventListenerTimeout = process.env.EVENT_LISTENER_TIMEOUT;
      let eventListenerTimeoutNumber = eventListenerTimeout
        ? parseInt(eventListenerTimeout)
        : DEFAULT_EVENT_LISTENER_TIMEOUT;
      this.providers[chains[name].wsPort].eventListenerTimeout = eventListenerTimeoutNumber;

      // Reduce timeout for chopsticks mode
      if (eventListenerTimeoutNumber === DEFAULT_EVENT_LISTENER_TIMEOUT && this.providers[chains[name].wsPort].mode == 'chopsticks') {
        this.providers[chains[name].wsPort].eventListenerTimeout = DEFAULT_EVENT_LISTENER_TIMEOUT_CHOPSTICKS;
      }

      await waitForChainToProduceBlocks(this.providers[chains[name].wsPort]);
    }

    await updateLastBlocks(this);
  });
};

const checkFileType = (fileBuffer: Buffer) => {
  try {
    const textDecoder = new TextDecoder('utf-8');
    const utf8String = textDecoder.decode(fileBuffer);
    return { isHex: utf8String.startsWith('0x'), hex: utf8String };
  } catch (e) {
    return { isHex: false, hex: '' };
  }

}

const readFile = (context, file: Runtime) => {
  let absolutePath = resolve(context.testPath, file.path);
  try {
    const fileBuffer: Buffer = readFileSync(absolutePath);
    const { isHex, hex } = checkFileType(fileBuffer);

    const stringHex: string = isHex ? hex : u8aToHex(fileBuffer);

    return { code: stringHex, hash: blake2AsHex(stringHex) };
  } catch (e) {
    console.log(`\n⛔ ERROR: while trying to read a file in ${file.path}`, e);
    process.exit(1);
  }
}

export const beforeReadRuntimes = (files) => {
  before(async function () {
    this.variables = this.variables ? this.variables : {};

    if (files) {
      Object.keys(files).forEach((key) => {
        if (!this.variables[`\$${key}`]) {
          this.variables[`\$${key}`] = readFile(this, files[key]).code;
          this.variables[`\$${key}.hash`] = readFile(this, files[key]).hash;
        } else {
          console.log(
            `\n⛔ ERROR: the key $'${key}' can not be reassigned for a variable`
          );
          process.exit(1);
        }
      });
    }
  });
};

export const beforeBuildDecodedCalls = (decodedCalls) => {
  before(async function () {
    this.variables = this.variables ? this.variables : {};

    if (decodedCalls) {
      Object.keys(decodedCalls).forEach((key) => {
        if (!this.variables[`\$${key}`]) {
          const { encoded, hash, len } = 
            decodedCalls[key].encode === false ? 
              buildEncodedCallHex(this, decodedCalls[key]) :
              buildEncodedCall(this, decodedCalls[key]);
          this.variables[`\$${key}`] = encoded;
          this.variables[`\$${key}.hash`] = hash;
          this.variables[`\$${key}.len`] = len;
        } else {
          console.log(
            `\n⛔ ERROR: the key $'${key}' can not be reassigned for a variable`
          );
          process.exit(1);
        }
      });
    }
  });
};

export const beforeAddConsoleGroups = (depth: number) => {
  before(function () {
    addConsoleGroup(depth);
  });

  after(function () {
    addConsoleGroupEnd(depth);
  });
};
