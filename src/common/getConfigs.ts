import { ApiPromise } from '@polkadot/api';
import { getSubstrateDynamicNames } from './getSubstrateDynamicNames';

interface Configs {
  chainName: string;
  ss58Format: number;
}

export const getConfigs = async (apiPromise: ApiPromise): Promise<Configs> => {
  const properties = apiPromise.registry.getChainProperties();
  const { ss58Format } = properties!;
  const systemChain = await apiPromise.rpc.system.chain();
  const chainName = systemChain.split(' ')[0];

  return { chainName, ss58Format: parseInt(ss58Format.toString()) };
};

export const getBridgeId = (sourceApi: ApiPromise, targetChain: string): Uint8Array => {
  const { bridgedMessages } = getSubstrateDynamicNames(targetChain);
  const bridgeId = sourceApi.consts[bridgedMessages].bridgedChainId.toU8a();

  if (!bridgeId) {
    throw new Error(`Missing bridgeId for ${targetChain} in ${bridgedMessages} pallet.`);
  }

  return bridgeId;
};
