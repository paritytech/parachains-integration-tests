import { 
  getProviderInfo,
  getConnections
} from './index';
// import { getAccountsInformation, loadAccounts } from './index'


export const connectToProviders = async (chainPort) => {
  const connectionDetails = getProviderInfo(chainPort);
  const connection = await getConnections(connectionDetails);

  // const keyringPair = loadAccounts();
  // const sourceAccounts = await getAccountsInformation(sourceChain, targetChain, keyringPair);
  // const targetAccounts = !(Object.keys(targetChain).length === 0) ? 
  //   await getAccountsInformation(targetChain, sourceChain, keyringPair) : []

  // return { 
  //   source: { chain: sourceChain, accounts: sourceAccounts }, 
  //   target: { chain: targetChain, accounts: targetAccounts }
  // }

  return connection
}