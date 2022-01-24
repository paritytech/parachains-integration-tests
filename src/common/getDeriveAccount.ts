import { compactAddLength, stringToU8a } from '@polkadot/util';
import { blake2AsHex, decodeAddress, encodeAddress } from '@polkadot/util-crypto';

const accountDerivation = 'pallet-bridge/account-derivation/account';

interface Data {
  ss58Format: number;
  bridgeId: Uint8Array;
  address: string;
}

export default function getDeriveAccount({ ss58Format = 42, bridgeId, address }: Data): string {
  if (!address) {
    return address;
  }
  const input = [...compactAddLength(stringToU8a(accountDerivation)), ...bridgeId, ...decodeAddress(address)];
  return encodeAddress(blake2AsHex(Uint8Array.from(input)), ss58Format);
}
