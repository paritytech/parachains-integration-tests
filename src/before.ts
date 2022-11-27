require('dotenv').config();
import {
  addConsoleGroup,
  addConsoleGroupEnd,
  buildEncodedCall,
  buildEncodedCallHex,
  updateLastBlocks,
  waitForChainToProduceBlocks,
} from './utils';
import { connectToProviders } from './connection';
import { TestFile, Chain } from './interfaces';
import {
  DEFAULT_EVENT_LISTENER_TIMEOUT,
  DEFAULT_ACTION_DELAY,
  DEFAULT_TIMEOUT,
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

export const beforeConnectToProviders = (testFile: TestFile) => {
  before(async function () {
    let timeout = process.env.TIMEOUT ? process.env.TIMEOUT : DEFAULT_TIMEOUT;
    this.timeout(timeout);
    let eventListenerTimeout = process.env.EVENT_LISTENER_TIMEOUT;
    this.eventListenerTimeout = eventListenerTimeout
      ? parseInt(eventListenerTimeout)
      : DEFAULT_EVENT_LISTENER_TIMEOUT;
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
      await waitForChainToProduceBlocks(this.providers[chains[name].wsPort]);
    }

    await updateLastBlocks(this);
  });
};

export const beforeBuildDecodedCalls = (decodedCalls) => {
  before(async function () {
    this.variables = {};
    if (decodedCalls) {
      Object.keys(decodedCalls).forEach((key) => {
        if (!this.variables[`\$${key}`]) {
          if (decodedCalls[key].encode === false) {
            this.variables[`\$${key}`] = buildEncodedCallHex(
              this,
              decodedCalls[key]
            );
          } else {
            this.variables[`\$${key}`] = buildEncodedCall(
              this,
              decodedCalls[key]
            );
          }
        } else {
          console.log(
            `\n⛔ ERROR: the key $'${key}' can not be reassigned for decoded calls`
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
