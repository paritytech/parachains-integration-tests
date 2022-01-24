import {
  connectToProviders,
  getLaunchConfig,
  getApisFromRelays
} from '../src/common';
import { waitForParachainToProduceBlocks } from "../src/common/test";


const main = async () => {
  let config = getLaunchConfig()

  const paraPort = config.parachains[0].nodes[0].wsPort
  const paraChains = await connectToProviders(paraPort, undefined);
  const { sourceApi: paraSourceApi } = getApisFromRelays(paraChains);

  await waitForParachainToProduceBlocks(paraSourceApi);

  process.exit(0);
}

main()