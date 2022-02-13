import { resolve } from "path";
import fs from "fs";
import { WsProvider, ApiPromise } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';
import { LaunchConfig } from "./interfaces/filesConfig";

import { TypeRegistry } from '@polkadot/types';

interface Configs {
  chainName: string;
  ss58Format: number;
}

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

export const getConfigs = async (apiPromise: ApiPromise): Promise<Configs> => {
  const properties = apiPromise.registry.getChainProperties();
  const { ss58Format } = properties!;
  const systemChain = await apiPromise.rpc.system.chain();
  const chainName = systemChain.split(' ')[0];

  return { chainName, ss58Format: parseInt(ss58Format.toString()) };
};

export const getBridgeId = (sourceApi: ApiPromise, targetChain: string): Uint8Array => {
  const { bridgedMessages } = getSubstrateDynamicNames(targetChain);
  const bridgeId = sourceApi.consts[bridgedMessages].bridgedChainId.toU8a();

  if (!bridgeId) {
    throw new Error(`Missing bridgeId for ${targetChain} in ${bridgedMessages} pallet.`);
  }

  return bridgeId;
};

const registry = new TypeRegistry();

export async function getApiConnection(connectionDetails: any) {
  const { hasher, provider, types } = connectionDetails;

  let apiPromise = await ApiPromise.create({ hasher: hasher, provider, types })

  registry.register(types);

  const configs = await getConfigs(apiPromise);

  return { api: apiPromise, isApiReady: true, configs };
}

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

const getInfo = (providerPort: string, types: ApiOptions['types']) => {
  const hasher = null;

  return {
    hasher,
    provider: new WsProvider(`ws://localhost:${providerPort}`),
    types
  };
};

const getProviderInfo = (chainPort) => {
  const sourceChain = getInfo(chainPort, {});

  return (
    {
      hasher: sourceChain.hasher,
      types: sourceChain.types,
      provider: sourceChain.provider
    }
  )
};


export const connectToProviders = async (chainPort) => {
  const connectionDetails = getProviderInfo(chainPort);
  const connection = await getConnections(connectionDetails);

  return connection
}

export const getLaunchConfig = () => {
  const config_file = './config.json'

  if (!config_file) {
    console.error("Missing config file argument...");
    process.exit();
  }

  let config_path = resolve(process.cwd(), config_file);

  if (!fs.existsSync(config_path)) {
    console.error("Config file does not exist: ", config_path);
    process.exit();
  }

  let config: LaunchConfig = require(config_path);

  return config
}