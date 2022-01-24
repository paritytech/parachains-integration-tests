import { u8aToHex } from '@polkadot/util'

export const buildEncodedCall = async (call) => {
  return u8aToHex((await call).toU8a().slice(2))
}