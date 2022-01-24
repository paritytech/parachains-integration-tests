import { 
  getApisFromRelays,
  getWallet,
  sendMessage,
  signAndSendCallback 
} from '../../common';
import { Xcm, BridgeData } from '../../interfaces/xcmData';
import { hexToU8a, compactAddLength } from '@polkadot/util';
import { xcmPallet, polkadotXcm, sudo } from '../../config';

export const sendXcm = async ({ relayChains, paraChains }, xcm: Xcm, isLocal) => {
  switch (xcm.message.type) {
    case "Transact":
      const { 
        message: {
          signer,
          messaging,
          parachain,
          originType,
          requireWeightAtMost,
          encodedCall,
        },
        bridgeData: {
          lane,
          fee,
          target,
          origin
        }
      } = xcm;

      let destination = {};
      // Default are DMP values
      let chains = relayChains
      let palletName = 'xcmPallet';
      let parents = 0
      let eventEvalSudo = { eventEval: sudo.Sudid, callback: () => {} }
      let eventEvalSent = { eventEval: xcmPallet.Sent, callback: () => { process.exit(0) }}

      if (messaging === 'dmp') { 
        destination = { v1: { parents, interior: { x1: { parachain }}}}
      } else if (messaging === 'ump') {
        parents = 1;
        chains = paraChains
        palletName = "polkadotXcm"
        destination = { v1: { parents, interior: { here: true }}}
        eventEvalSent = { eventEval: polkadotXcm.Sent, callback: () => { process.exit(0) }}
      }

      const { sourceApi, targetApi } = getApisFromRelays(chains);

      let api = isLocal ? sourceApi : targetApi;
    
      const signerAccount = await getWallet(signer);
    
      let messageObj = {
        v1: { Transact: { originType, requireWeightAtMost, call: compactAddLength(hexToU8a(encodedCall))}}
      }
      let call = api.tx.sudo.sudo(api.tx[palletName].send(destination, messageObj))

      let nonce = await api.rpc.system.accountNextIndex(signerAccount.address);

      if (isLocal) {
        await (await call).signAndSend(
          signerAccount, 
          { nonce, era: 0 },
          signAndSendCallback([eventEvalSudo, eventEvalSent])
        );
      } else {
        const targetAccount = target ? await getWallet(target) : undefined;

        let message: BridgeData = {
          signer: signerAccount,
          fee,
          lane,
          call,
          origin,
          target: targetAccount
        }
        await sendMessage(relayChains, message)
      }
  }    
}