import { BridgeData } from '../interfaces/xcmData';
import { compactAddLength } from '@polkadot/util';
import { getSubstrateDynamicNames } from './getSubstrateDynamicNames';
import { getApisFromRelays } from './getApisFromRelays';
import { getBridgeId } from './getConfigs';
import {  } from '@polkadot/util'


export const sendMessage = async (relayChains, message: BridgeData) => {
  const {
    fee,
    lane,
    signer,
    call,
    origin,
    target
  } = message;

  const { sourceApi, targetApi } = getApisFromRelays(relayChains);

  let callPayload = (await call).toU8a().slice(2)
  let weight = (await call.paymentInfo(signer)).weight.toNumber();

  let callCompact = compactAddLength(callPayload!)
  let specVersion = targetApi.consts.system.version.specVersion;

  let sourceChainAccountId = signer!.address
  let sourceChainAccountIdRaw = signer!.addressRaw;

  let sourceChainId = getBridgeId(targetApi, relayChains.source.chain.name)
  let targetChainId = getBridgeId(sourceApi, relayChains.target.chain.name)

  let originPayload: Object;

  if (origin.type === "TargetAccount") {

    let encodedMessage = [
      ...callPayload, 
      ...sourceChainAccountIdRaw, 
      ...specVersion.toU8a(),
      ...sourceChainId, 
      ...targetChainId
    ]

    let targetChainSignature = { Sr25519: target.sign(encodedMessage) }
    let targetChainAccountPublic = { Sr25519: target.publicKey }

    originPayload = { TargetAccount: [sourceChainAccountId, targetChainAccountPublic, targetChainSignature] }
  } else if (origin.type === "SourceRoot") {
    // Not Implemented
    originPayload = { RootSource: signer!.addressRaw }
  } else {
    originPayload = { SourceAccount: signer!.addressRaw }
  }

  const payload = {
    call: callCompact,
    origin: originPayload,
    spec_version: specVersion.toNumber(),
    weight
  };

  const { bridgedMessages } = getSubstrateDynamicNames(relayChains.target.chain.name);
  
  const bridgeMessage = sourceApi.tx[bridgedMessages].sendMessage(lane, payload, fee);

  let nonce = await sourceApi.rpc.system.accountNextIndex(signer.address);

  await bridgeMessage.signAndSend(signer, { nonce });
}