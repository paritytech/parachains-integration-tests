// import { encodeAddress } from '@polkadot/util-crypto';
// import { formatBalance } from '@polkadot/util';
// import keyring from '@polkadot/ui-keyring';
// import { getBridgeId } from './getConfigs';
// import getDeriveAccount from './getDeriveAccount';


// const formatBalanceAddress = (data: any, api: any) => {
//   return {
//     chainTokens: data.registry.chainTokens[0],
//     formattedBalance: formatBalance(data.free, {
//       decimals: api.registry.chainDecimals[0],
//       withUnit: api.registry.chainTokens[0],
//       withSi: true
//     }),
//     free: data.free
//   };
// };

// export const loadAccounts = () => {
//   keyring.loadAll({ isDevelopment: true })
//   return keyring.getPairs();
// }

// export const getAccountsInformation = async (sourceRole: any, targetRole: any, keyringPairs: any) => {
//   const {
//     api: sourceApi ,
//     name: sourceChain,
//     configs: sourceConfigs
//   } = sourceRole;
//   const {
//     api: targetApi ,
//     configs: targetConfigs
//   } = targetRole;

//   const accounts = await Promise.all(
//     keyringPairs.map(async (pair: any) => {
//       const { address, meta } = pair;
//       const sourceAddress = encodeAddress(address, sourceConfigs.ss58Format);
//       const toDerive = {
//         ss58Format: targetConfigs.ss58Format,
//         address: sourceAddress || '',
//         bridgeId: getBridgeId(targetApi, sourceChain)
//       };
//       const { data } = await sourceApi.query.system.account(sourceAddress);
//       const sourceBalance = formatBalanceAddress(data, sourceApi);

//       const companionAddress = getDeriveAccount(toDerive);
//       const { data: dataCompanion } = await targetApi.query.system.account(companionAddress);
//       const targetBalance = formatBalanceAddress(dataCompanion, targetApi);

//       const name = (meta.name as string).toLocaleUpperCase();

//       return {
//         account: { address: sourceAddress, balance: sourceBalance, name },
//         companionAccount: { address: companionAddress, balance: targetBalance, name }
//       };
//     })
//   );

//   return accounts;
// };

// export default getAccountsInformation;

