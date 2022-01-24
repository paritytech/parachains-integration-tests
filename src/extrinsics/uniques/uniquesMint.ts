require('dotenv').config()
import commandLineArgs from 'command-line-args';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  signAndSendCallback
} from '../../common';
import { uniques } from '../../config';

const mintUnique = async ({ api, id, instance, owner, wallet }) => {
  let nonce = await api.rpc.system.accountNextIndex(wallet.address);
  let ownerObj = { Id: owner.address }

  let eventEval = { eventEval: uniques.Issued, callback: () => { process.exit(0) }}

  await api.tx.uniques.mint(id, instance, ownerObj)
    .signAndSend(
      wallet, 
      { nonce, era: 0 },
      signAndSendCallback([eventEval])
    );
}

const main = async () => {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: Number },
    { name: 'instance', alias: 't', type: Number },
    { name: 'owner', alias: 'o', type: String },
    { name: 'signer', alias: 's', type: String }
  ]
  const options = commandLineArgs(optionDefinitions);
  const { id, instance, owner, signer } = options;

  let config = getLaunchConfig()
  const paraPort = config.parachains[0].nodes[0].wsPort

  const relayChain = await connectToProviders(paraPort, undefined);

  const data = { // source
    api: relayChain.source.chain.api,
    id,
    instance,
    owner: await getWallet(owner),
    wallet: await getWallet(signer)
  }

  await mintUnique(data)  
}

main()