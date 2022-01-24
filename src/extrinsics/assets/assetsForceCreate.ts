require('dotenv').config()
import commandLineArgs from 'command-line-args';
import { hexToU8a, compactAddLength } from '@polkadot/util';
import {
  connectToProviders,
  getWallet,
  getLaunchConfig,
  signAndSendCallback,
  hasSudo,
  buildEncodedCall
} from '../../common';
import { sudo, assets, polkadotXcm } from '../../config';


const forceCreateAsset = async ({ relayApi, paraApi, id, owner, isSufficient, minBalance, wallet }) => {
  let ownerObj = { Id: owner.address }
  let call = paraApi.tx.assets.forceCreate(id, ownerObj, isSufficient, minBalance);

  let eventEvalSudo = { eventEval: sudo.Sudid, callback: () => {} }
  let eventEvalForceCreated = { eventEval: assets.ForceCreated, callback: () => { process.exit(0) }}
  let eventEvalSent = { eventEval: polkadotXcm.Sent, callback: () => { process.exit(0) }}

  console.log("========== ENTRA ========== HAS SUDO: ", hasSudo(paraApi))

  if (await hasSudo(paraApi)) {
    let nonce = await paraApi.rpc.system.accountNextIndex(wallet.address);
    await paraApi.tx.sudo.
        sudo(call).
        signAndSend(
          wallet, 
          { nonce, era: 0 },
          signAndSendCallback([eventEvalSudo, eventEvalForceCreated])
        );
  } else {
    let encodedCall = await buildEncodedCall(call)

    let messageObj = {
      v1: { 
        Transact: { 
          originType: 'Superuser', 
          requireWeightAtMost: 1000000000, 
          call: compactAddLength(hexToU8a(encodedCall))
        }
      }
    }
    let destination = { v1: { parents: 0, interior: { x1: { parachain: 1000 }}}}
    let relayCall = relayApi.tx.sudo.sudo(relayApi.tx.xcmPallet.send(destination, messageObj))
    let nonce = await relayApi.rpc.system.accountNextIndex(wallet.address);

    await (await relayCall).signAndSend(
      wallet, 
      { nonce, era: 0 },
      signAndSendCallback([eventEvalSudo, eventEvalSent])
    );
  }
}

const main = async () => {
  const optionDefinitions = [
    { name: 'id', alias: 'i', type: Number },
    { name: 'owner', alias: 'o', type: String },
    { name: 'isSufficient', alias: 'u', type: Boolean },
    { name: 'minBalance', alias: 'm', type: Number },
    { name: 'signer', alias: 's', type: String }
  ]
  const options = commandLineArgs(optionDefinitions);
  const { id, owner, isSufficient, minBalance, signer } = options;

  let config = getLaunchConfig()
  const paraPort = config.parachains[0].nodes[0].wsPort
  const relayPort = config.relaychain.nodes[0].wsPort

  const paraChain = await connectToProviders(paraPort, undefined);
  const relayChain = await connectToProviders(relayPort, undefined);

  console.log()

  const data = { // source
    // paraName: paraChain.source.chain.name,
    relayApi: relayChain.source.chain.api,
    paraApi: paraChain.source.chain.api,
    id,
    owner: await getWallet(owner),
    isSufficient,
    minBalance,
    wallet: await getWallet(signer)
  }

  await forceCreateAsset(data)  
}

main()