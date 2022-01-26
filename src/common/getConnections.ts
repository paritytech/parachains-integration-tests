import { getApiConnection } from './getApiConnection';

export async function getConnections(chainsConnection) {
  const { 
    configs: chainConfigs, 
    api: chainApiPromise, 
    isApiReady: chainApiReady
  } = await getApiConnection(chainsConnection);

  const chainName1 = chainConfigs.chainName;

  let connection = {
      name: chainName1,
      configs: chainConfigs,
      api: chainApiPromise,
      isApiReady: chainApiReady,
      subscriptions: {}
  };

  return connection;
}