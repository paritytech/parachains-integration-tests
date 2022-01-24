require('dotenv').config()
import commandLineArgs from 'command-line-args';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  signAndSendCallback
} from '../../common';
import { assets } from '../../config';

const setMetadataAsset = async ({ api, id, name, symbol, decimals, wallet }) => {
  let nonce = await api.rpc.system.accountNextIndex(wallet.address);
  let eventEval = { eventEval: assets.MetadataSet, callback: () => { process.exit(0) }}

  await api.tx.assets.setMetadata(id, name, symbol, decimals)
    .signAndSend(
      wallet, 
      { nonce, era: 0 },
      signAndSendCallback([eventEval])
    );
}

const main = async () => {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: Number },
    { name: 'name', alias: 'n', type: String },
    { name: 'symbol', alias: 'y', type: String },
    { name: 'decimals', alias: 'd', type: Number },
    { name: 'signer', alias: 's', type: String }
  ]
  const options = commandLineArgs(optionDefinitions);
  const { id, name, symbol, decimals, signer } = options;

  let config = getLaunchConfig()
  const paraPort = config.parachains[0].nodes[0].wsPort

  const relayChain = await connectToProviders(paraPort, undefined);

  const data = { // source
    api: relayChain.source.chain.api,
    id,
    name,
    symbol,
    decimals,
    wallet: await getWallet(signer)
  }

  await setMetadataAsset(data)  
}

main()