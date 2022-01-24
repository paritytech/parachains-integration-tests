export interface LaunchConfig {
	relaychain: RelayChainConfig;
	parachains: ParachainConfig[];
	simpleParachains: SimpleParachainConfig[];
	hrmpChannels: HrmpChannelsConfig[];
	types: any;
	finalization: boolean;
}

export interface RelayChainConfig {
	bin: string;
	chain: string;
	nodes: {
		name: string;
		basePath?: string;
		wsPort: number;
		rpcPort?: number;
		port: number;
		flags?: string[];
	}[];
	genesis?: JSON;
}

export interface ParachainNodeConfig {
	rpcPort?: number;
	wsPort: number;
	port: number;
	basePath?: string;
	name?: string;
	flags: string[];
}

export interface ParachainConfig {
	bin: string;
	id?: string;
	balance: string;
	chain?: string;
	nodes: ParachainNodeConfig[];
}

export interface SimpleParachainConfig {
	bin: string;
	id: string;
	port: string;
	balance: string;
}

export interface HrmpChannelsConfig {
	sender: number;
	recipient: number;
	maxCapacity: number;
	maxMessageSize: number;
}