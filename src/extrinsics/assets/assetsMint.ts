require('dotenv').config()
import commandLineArgs from 'command-line-args';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  signAndSendCallback
} from '../../common';
import { assets } from '../../config';


const mintAsset = async ({ api, id, beneficiary, amount, wallet }) => {
  let nonce = await api.rpc.system.accountNextIndex(wallet.address);
  let beneficiaryObj = { Id: beneficiary.address }
  let eventEval = { eventEval: assets.Issued, callback: () => { process.exit(0) }}

  await api.tx.assets.mint(id, beneficiaryObj, amount)
    .signAndSend(
      wallet, 
      { nonce, era: 0 },
      signAndSendCallback([eventEval])
    );
}

const main = async () => {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: Number },
    { name: 'beneficiary', alias: 'b', type: String },
    { name: 'amount', alias: 'a', type: String },
    { name: 'signer', alias: 's', type: String }
  ]
  const options = commandLineArgs(optionDefinitions);
  const { id, beneficiary, amount, signer } = options;

  let config = getLaunchConfig()
  const paraPort = config.parachains[0].nodes[0].wsPort

  const relayChain = await connectToProviders(paraPort, undefined);

  const data = { // source
    api: relayChain.source.chain.api,
    id,
    beneficiary: await getWallet(beneficiary),
    amount,
    wallet: await getWallet(signer)
  }

  await mintAsset(data)  
}

main()