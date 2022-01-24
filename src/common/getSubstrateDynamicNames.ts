export interface SubstrateDynamicNames {
  bridgedGrandpaChain: string;
  bridgedMessages: string;
  estimatedFeeMethodName: string;
  latestReceivedNonceMethodName: string;
  storageKey: string;
}

export function getSubstrateDynamicNames(key: string): SubstrateDynamicNames {
  const bridgedGrandpaChain = `bridge${key}Grandpa`;
  const bridgedMessages = `bridge${key}Messages`;
  const estimatedFeeMethodName = `To${key}OutboundLaneApi_estimate_message_delivery_and_dispatch_fee`;
  const latestReceivedNonceMethodName = `From${key}InboundLaneApi_latest_received_nonce`;

  const storageKey = `${key}-bridge-ui-transactions`;

  return {
    bridgedGrandpaChain,
    bridgedMessages,
    estimatedFeeMethodName,
    latestReceivedNonceMethodName,
    storageKey
  };
}
