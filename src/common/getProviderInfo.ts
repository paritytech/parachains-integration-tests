import { WsProvider } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';

const getInfo = (providerPort: string, types: ApiOptions['types']) => {
  const hasher = null;

  return {
    hasher,
    provider: new WsProvider(`ws://localhost:${providerPort}`),
    types
  };
};

export const getProviderInfo = (sourceChainPort, targetChainPort) => {
  const sourceChain = getInfo(sourceChainPort, {});
  const targetChain = targetChainPort ? getInfo(targetChainPort, {}) : undefined;

  return [
    {
      hasher: sourceChain.hasher,
      types: sourceChain.types,
      provider: sourceChain.provider
    },
    {
      hasher: targetChain?.hasher,
      types: targetChain?.types,
      provider: targetChain?.provider
    }
  ];
};