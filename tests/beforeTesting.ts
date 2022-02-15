import { buildEncodedCall } from './utils';
import { connectToProviders } from './connection';
import { TestsConfig } from './interfaces/test';

export const beforeConnectToProviders = (testConfig: TestsConfig) => {
  before(async function() {
    this.providers = {};

    let chains = testConfig.settings.chains

    for (let name in chains) {
      this.providers[chains[name].wsPort] = await connectToProviders(chains[name].wsPort)
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