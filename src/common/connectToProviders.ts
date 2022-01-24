import { 
  getProviderInfo,
  getConnections
} from './index';
// import { getAccountsInformation, loadAccounts } from './index'


export const connectToProviders = async (sourceChainPort, targetChainPort) => {
  const [
    connectionDetails1, 
    connectionDetails2
  ] = getProviderInfo(sourceChainPort, targetChainPort);
  const { connections } = await getConnections([connectionDetails1, connectionDetails2]);
  const { sourceChain, targetChain } = connections;

  // const keyringPair = loadAccounts();
  // const sourceAccounts = await getAccountsInformation(sourceChain, targetChain, keyringPair);
  // const targetAccounts = !(Object.keys(targetChain).length === 0) ? 
  //   await getAccountsInformation(targetChain, sourceChain, keyringPair) : []

  // return { 
  //   source: { chain: sourceChain, accounts: sourceAccounts }, 
  //   target: { chain: targetChain, accounts: targetAccounts }
  // }

  return { 
    source: { chain: sourceChain }, 
    target: { chain: targetChain }
  }
}