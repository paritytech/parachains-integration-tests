import { ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { getConfigs } from './getConfigs';

const registry = new TypeRegistry();

export async function getApiConnection(connectionDetails: any) {
  const { hasher, provider, types } = connectionDetails;

  let apiPromise = await ApiPromise.create({ hasher: hasher, provider, types })

  registry.register(types);

  const configs = await getConfigs(apiPromise);

  return { api: apiPromise, isApiReady: true, configs };
}
