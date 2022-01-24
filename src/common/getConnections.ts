import { getApiConnection } from './getApiConnection';

export async function getConnections(chainsConnections: any) {
  const [connectionDetails1, connectionDetails2] = chainsConnections;

  const { 
    configs: chain1Configs, 
    api: chain1ApiPromise, 
    isApiReady: chain1ApiReady
  } = await getApiConnection(connectionDetails1);

  const chainName1 = chain1Configs.chainName;

  let connections = {
    sourceChain: {
      name: chainName1,
      configs: chain1Configs,
      api: chain1ApiPromise,
      isApiReady: chain1ApiReady,
      subscriptions: {}
    },
    targetChain: {}
  };

  if (connectionDetails2.provider) {
    const { 
      configs: chain2Configs, 
      api: chain2ApiPromise, 
      isApiReady: chain2ApiReady
    } = await getApiConnection(connectionDetails2);
  
    const chainName2 = chain2Configs.chainName;
  
    const targetChain = {
      name: chainName2,
      configs: chain2Configs,
      api: chain2ApiPromise,
      isApiReady: chain2ApiReady,
      subscriptions: {}
    }
    connections.targetChain = targetChain
  }

  return { connections };
}