import { buildEncodedCall, waitForChainToProduceBlocks } from './utils';
import { connectToProviders } from './connection';
import { TestFile, Chain } from './interfaces';

const checkChains = (chains: { [key: string]: Chain }): { [key: string]: Chain }  => {
  for (let id in chains) {
    // if (!chains[id].wsPort || typeof chains[id].wsPort !== 'number') {
    if (!chains[id].wsPort) {
      console.log(`\n⚠️  "wsPort" should be defined for chain ${id}:`)
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
    this.timeout(1000000)
    this.providers = {};
    this.testPath = testFile.dir
    this.testName = testFile.name

    let chains = testFile.yaml.settings.chains
    chains = checkChains(chains)

    for (let name in chains) {
      console.log(`\n🔌 Connecting to ${name}...\n`)
      this.providers[chains[name].wsPort] = await connectToProviders(chains[name])
      await waitForChainToProduceBlocks(this.providers[chains[name].wsPort])
    }
  })
}

export const beforeBuildEncodedCalls = (decodedCalls) => {
  before(async function() {
    this.variables = {}

    Object.keys(decodedCalls).forEach(key => {
      if (!this.variables[`\$${key}`]) {
        this.variables[`\$${key}`] = buildEncodedCall(this, decodedCalls[key])
      } else {
        console.log(`\n⚠️  the key $"${key}" can not be reassigend`)
        process.exit(1)
      }
    })
  })
}