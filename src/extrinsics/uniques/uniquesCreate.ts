require('dotenv').config()
import commandLineArgs from 'command-line-args';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  signAndSendCallback
} from '../../common';
import { uniques } from '../../config';

const createUnique = async ({ api, id, admin, wallet }) => {
  let nonce = await api.rpc.system.accountNextIndex(wallet.address);
  let adminObj = { Id: admin.address }

  let eventEval = { eventEval: uniques.Created, callback: () => { process.exit(0) }}

  await api.tx.uniques.create(id, adminObj)
    .signAndSend(
      wallet, 
      { nonce, era: 0 },
      signAndSendCallback([eventEval])
    );
}

const main = async () => {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: Number },
    { name: 'admin', alias: 'a', type: String },
    { name: 'signer', alias: 's', type: String }
  ]
  const options = commandLineArgs(optionDefinitions);
  const { id, admin, signer } = options;

  let config = getLaunchConfig()
  const paraPort = config.parachains[0].nodes[0].wsPort

  const relayChain = await connectToProviders(paraPort, undefined);

  const data = { // source
    api: relayChain.source.chain.api,
    id,
    admin: await getWallet(admin),
    wallet: await getWallet(signer)
  }

  await createUnique(data)  
}

main()