require('dotenv').config()
import { addConsoleGroup, addConsoleGroupEnd, buildEncodedCall, waitForChainToProduceBlocks } from './utils';
import { connectToProviders } from './connection';
import { TestFile, Chain } from './interfaces';
import { DEFAULT_EVENT_LISTENER_TIMEOUT, DEFAULT_ACTION_DELAY, DEFAULT_TIMEOUT } from './constants';

const checkChains = (chains: { [key: string]: Chain }): { [key: string]: Chain }  => {
  for (let id in chains) {
    if (!chains[id].wsPort) {
      console.log(`\n⛔ ERROR: 'wsPort' should be present for chain ${id}:`)
      process.exit(1)
    }

    if(!chains[id].ws) {
      chains[id].ws = 'ws://localhost'
    }
  }
  return chains
}

export const beforeConnectToProviders = (testFile: TestFile) => {
  before(async function() {
    let timeout = process.env.TIMEOUT ? process.env.TIMEOUT : DEFAULT_TIMEOUT
    this.timeout(timeout)
    let eventListenerTimeout = process.env.EVENT_LISTENER_TIMEOUT
    this.eventListenerTimeout = eventListenerTimeout ? parseInt(eventListenerTimeout) : DEFAULT_EVENT_LISTENER_TIMEOUT
    let actionDelay = process.env.QUERY_DELAY
    this.actionDelay = actionDelay ? actionDelay : DEFAULT_ACTION_DELAY
    this.providers = {};
    this.testPath = testFile.dir
    this.testName = testFile.name

    let chains = testFile.yaml.settings.chains
    chains = checkChains(chains)

    for (let name in chains) {
      console.log(`\n🔌 Connecting to '${name}'...\n`)
      this.providers[chains[name].wsPort] = await connectToProviders(chains[name])
      await waitForChainToProduceBlocks(this.providers[chains[name].wsPort])
    }
  })
}

export const beforeBuildEncodedCalls = (decodedCalls) => {
  before(async function() {
    this.variables = {}
    if (decodedCalls) {
      Object.keys(decodedCalls).forEach(key => {
        if (!this.variables[`\$${key}`]) {
          this.variables[`\$${key}`] = buildEncodedCall(this, decodedCalls[key])
        } else {
          console.log(`\n⛔ ERROR: the key $'${key}' can not be reassigned for encoding calls`)
          process.exit(1)
        }
      })
    }
  })
}

export const beforeAddConsoleGroups = (depth: number) => {
  before(function () {
    addConsoleGroup(depth)
  })

  after(function () {
    addConsoleGroupEnd(depth)
  })
}  