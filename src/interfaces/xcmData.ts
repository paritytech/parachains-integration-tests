type XcmMessage = TeleportData | TransactData

export interface Xcm {
  message: XcmMessage,
  bridgeData: BridgeData
}
export interface BridgeData {
  signer: any,
  fee: string,
  lane: string,
  call?: any,
  origin: BridgeOrigin,
  target?: any
}
export type TeleportData = {
  type: "TeleportAsset",
  messaging: "dmp" | "ump",
  parachain: Number | undefined,
  signer: any,
  beneficiary: string,
  amount: string,
  feeAssetItem: string,
}
export type TransactData = {
  type: "Transact",
  messaging: "dmp" | "ump",
  parachain: Number | undefined,
  signer: any,
  originType: string,
  requireWeightAtMost: string,
  encodedCall: string
}

export type BridgeOrigin = {
  type: "SourceAccount" | "TargetAccount" | "SourceRoot"
}