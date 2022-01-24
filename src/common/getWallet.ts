import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';

export const getWallet = async (uri) => {
  if (uri.substring(0,2) === '//') {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    return keyring.addFromUri(uri);
  }
  else {
    return { address: uri, addressRaw: decodeAddress(uri)}
  }
}
