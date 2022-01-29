import { throws } from 'assert';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  getBalance,
  getApisFromRelays
} from '../src/common';

export const beforeConnectToProviders = () => {
    // return(
      before(async function() {
        let config = getLaunchConfig()
        let providers = {};

        providers[config.relaychain.name] = await connectToProviders(config.relaychain.nodes[0].wsPort)

        // config.parachains.forEach(parachain => {
        //   providers[parachain.name] = parachain.nodes[0].wsPort
        // })

        for (let parachain of config.parachains) {
          providers[parachain.name] = await connectToProviders(parachain.nodes[0].wsPort)
        }
        // console.log("Providers", providers)
        this.providers = providers
      })
    // )
}