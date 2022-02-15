import { buildEncodedCall, getLaunchConfig } from './utils';
import { connectToProviders } from './connection';

export const beforeConnectToProviders = () => {
  before(async function() {
    let config = getLaunchConfig()
    let providers = {};

    providers[config.relaychain.name] = await connectToProviders(config.relaychain.nodes[0].wsPort)

    for (let parachain of config.parachains) {
      providers[parachain.name] = await connectToProviders(parachain.nodes[0].wsPort)
    }

    this.providers = providers
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
    console.log("EncodedCalls", this.variables)
  })
}