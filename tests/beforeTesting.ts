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
    this.queries = {}
  })
}

export const beforeBuildEncodedCalls = (decodedCalls) => {
  before(async function() {
    this.encodedCalls = {}

    Object.keys(decodedCalls).forEach(key => {
      if (!this.encodedCalls[key]) {
        this.encodedCalls[key] = buildEncodedCall(this.providers, decodedCalls[key])
      } else {
        console.log(`\n⚠️  the decoded call id "${key}" can not be reassigend`)
        process.exit(1)
      }
    })
    console.log("EncodedCalls", this.encodedCalls)
  })
}