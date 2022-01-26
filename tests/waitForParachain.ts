import {
  connectToProviders,
  getLaunchConfig,
  getApisFromRelays
} from '../src/common';
import { waitForParachainToProduceBlocks } from "../src/common/test";


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