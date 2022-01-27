import {
  connectToProviders,
  getLaunchConfig,
  getApisFromRelays
} from '../src/common';

const waitForParachainToProduceBlocks = async (api): Promise<void> => {
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

const main = async () => {
  let config = getLaunchConfig()
  const paraNumber = config.parachains.length;
  const paraPort = config.parachains[paraNumber - 1].nodes[0].wsPort
  const paraChain = await connectToProviders(paraPort);

  // console.log("Entra", paraChain.api)

  await waitForParachainToProduceBlocks(paraChain.api);

  process.exit(0);
}

main()