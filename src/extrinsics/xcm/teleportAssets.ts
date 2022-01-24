import { 
  getApisFromRelays,
  getWallet,
  sendMessage,
  signAndSendCallback
} from '../../common';
import { BridgeData, Xcm } from '../../interfaces/xcmData';
import { xcmPallet, polkadotXcm } from '../../config';

export const teleportAsset = async ({ relayChains, paraChains }, xcm: Xcm, isLocal) => {
  switch (xcm.message.type) {
    case "TeleportAsset":
      const { 
        message: {
          messaging,
          parachain,
          signer,
          beneficiary,
          amount,
          feeAssetItem
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
      let eventEvalAttempted = { eventEval: xcmPallet.Attempted, callback: () => {process.exit(0)}}

      if (messaging === 'dmp') {   
        destination = { v1: { parents, interior: { x1: { parachain }}}}
      } else if (messaging === 'ump') {
        parents = 1;
        chains = paraChains
        palletName = "polkadotXcm"
        destination = { v1: { parents, interior: { here: true }}}
        eventEvalAttempted = { eventEval: polkadotXcm.Attempted, callback: () => {process.exit(0)}}
      }

      const { sourceApi, targetApi } = getApisFromRelays(chains);
    
      let api = isLocal ? sourceApi : targetApi;
    
      const signerAccount = await getWallet(signer);
      const beneficiaryAccount = await getWallet(beneficiary);
    
      let beneficiaryObj = {
        v1: { parents: 0, interior: { x1: { accountId32: { network: { any: true }, id: beneficiaryAccount.addressRaw }}}}
      }

      let assets = { v1: [{id: { concrete: { parents, interior: { here: true }}}, fun: { fungible: amount }}]}

      let call = api.tx[palletName].limitedTeleportAssets(destination, beneficiaryObj, assets, feeAssetItem, { unlimited: true })
      let nonce = await api.rpc.system.accountNextIndex(signerAccount.address);

      if (isLocal) {
        await (await call).signAndSend(
          signerAccount, 
          { nonce, era: 0 }, 
          signAndSendCallback([eventEvalAttempted])
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