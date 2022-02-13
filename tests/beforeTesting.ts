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
    this.encodedCalls = {}

    Object.keys(decodedCalls).forEach(key => {
      this.encodedCalls[key] = buildEncodedCall(this.providers, decodedCalls[key])
    })
    console.log("EncodedCalls", this.encodedCalls)
  })
}