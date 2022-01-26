import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  getBalance,
  getApisFromRelays
} from '../../common';

export const waitForParachainToProduceBlocks = async (api): Promise<void> => {
  return new Promise(async resolve => {
    const unsubHeads = await api.rpc.chain.subscribeNewHeads((lastHeader) => {
      if (lastHeader.number >= 1) {
        unsubHeads();
        resolve()
      } else {
        console.log("Waiting for the Parachain to produce blocks...")
      }
    });
  })
}

export const beforeConnectToProviders = () => {
    return(
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
        console.log("Providers", providers)
      })
    )
}