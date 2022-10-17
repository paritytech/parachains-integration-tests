import { WsProvider, ApiPromise } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';
import { Chain, ChainConfigs, Connection } from './interfaces';

import { TypeRegistry } from '@polkadot/types';

export const getConfigs = async (
  apiPromise: ApiPromise
): Promise<ChainConfigs> => {
  const properties = apiPromise.registry.getChainProperties();
  const { ss58Format } = properties!;
  const systemChain = await apiPromise.rpc.system.chain();
  const chainName = systemChain.toString();

  return { chainName, ss58Format: parseInt(ss58Format.toString()) };
};

const registry = new TypeRegistry();

export async function getApiConnection(connectionDetails: any) {
  const { hasher, provider, types } = connectionDetails;

  let apiPromise = await ApiPromise.create({
    hasher: hasher,
    provider,
    types,
  });

  registry.register(types);

  const configs = await getConfigs(apiPromise);

  return { api: apiPromise, isApiReady: true, configs };
}

export async function getConnections(chainsConnection): Promise<Connection> {
  const {
    configs: chainConfigs,
    api: chainApiPromise,
    isApiReady: chainApiReady,
  } = await getApiConnection(chainsConnection);

  const chainName = chainConfigs.chainName;

  let connection: Connection = {
    name: chainName,
    configs: chainConfigs,
    api: chainApiPromise,
    isApiReady: chainApiReady,
    subscriptions: {},
    lastBlock: '0',
  };

  return connection;
}

const getInfo = (chain: Chain, types: ApiOptions['types']) => {
  const hasher = null;
  const { ws, wsPort } = chain;

  return {
    hasher,
    provider: new WsProvider(`${ws}:${wsPort}`),
    types,
  };
};

const getProviderInfo = (chain: Chain) => {
  const sourceChain = getInfo(chain, {});

  return {
    hasher: sourceChain.hasher,
    types: sourceChain.types,
    provider: sourceChain.provider,
  };
};

export const connectToProviders = async (chain: Chain) => {
  const connectionDetails = getProviderInfo(chain);
  const connection = await getConnections(connectionDetails);

  return connection;
};
