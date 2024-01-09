export interface TestFile {
  name: string;
  dir: string;
  yaml: TestsConfig;
  yamlDoc: any;
  file: string;
}
export interface TestsConfig {
  settings: Settings;
  tests: Describe[];
}
export interface Describe {
  name: string;
  before?: Before[];
  beforeEach?: BeforeEach[];
  after?: After[];
  afterEach?: AfterEach[];
  its?: It[];
  path?: string,
  describes?: Describe[]; // It is possible to nest Describes
}

export interface Before {
  name?: string;
  actions: Action[];
}

export interface BeforeEach extends Before {}

export interface After extends Before {}

export interface AfterEach extends Before {}

export type Hook = Before | BeforeEach | After | AfterEach;

export interface BlockTravel {
  chain: Chain;
  count?: number;
  to?:number;
  events?: Event[];
}

export interface TimeTravel {
  chain: Chain;
  date: string | number;
  events?: Event[];
}

export interface SetStorage {
  chain: Chain;
  storage: object;
  events?: Event[];
}

export interface SetHead {
  chain: Chain;
  block: string | number;
  events?: Event[];
}

export interface Custom {
  path: string;
  args: any[];
  events?: Event[];
}

export interface Query {
  chain: Chain;
  delay?: number;
  pallet: string;
  call: string;
  args: any[];
}

export interface Rpc {
  chain: Chain;
  delay?: number;
  method: string;
  call: string;
  args: any[];
  events?: Event[];
}

export interface Call {
  encode?: boolean; // Indicates if the Call should be encoded
  chain: Chain;
  sudo?: boolean; // if 'true', the call will be wrapped with 'sudo.sudo()'
  pallet: string;
  call: string;
  args: any[];
}

export interface Extrinsic extends Call {
  signer: string;
  delay?: number;
  events: Event[];
}

export interface Event {
  chain: Chain;
  name: string;
  remote: boolean; // indicates if its considered as a remote event (different chain context)
  timeout?: number; // overrides de default event listener timeout
  attributes?: Attribute[];
  result?: object;
  strict: boolean;
  threshold?: any;
}

export interface EventData {
  type: string;
  lookupName: string;
  key?: string;
  value: any;
  xcmOutcome?: XcmOutcome; // only for 'XcmV2TraitsOutcome' type
}

export interface EventResult extends Event {
  received: boolean;
  ok: boolean;
  message: string;
  data: EventData[];
  record?: any;
}

export interface EventResultsObject {
  [key: string]: EventResult[];
}

export interface Attribute {
  type?: string;
  key?: string;
  isRange?: boolean;
  threshold?: any;
  value?: any;
  xcmOutcome?: XcmOutcome; // only for 'XcmV2TraitsOutcome' type
}

export enum XcmOutcome {
  Complete = 'Complete',
  Incomplete = 'Incomplete',
  Error = 'Error',
}

export interface It {
  name: string;
  actions: Action[];
}

export type ExtrinsicAction = { extrinsics: Extrinsic[] };
export type QueryAction = { queries: { [key: string]: Query } };
export type RpcAction = { rpcs: { [key: string]: Rpc } };
export type AsserAction = { asserts: { [key: string]: AssertOrCustom } };
export type CustomAction = { customs: Custom[] };
export type BlockTravelAction = { block_travels: BlockTravel[] };
export type TimeTravelAction = { time_travels: TimeTravel[] };
export type SetStorageAction = { set_storages: SetStorage[] };
export type SetHeadAction = { set_heads: SetHead[] };

export type Action =
  | ExtrinsicAction
  | QueryAction
  | AsserAction
  | RpcAction
  | CustomAction
  | BlockTravelAction
  | TimeTravelAction
  | SetStorageAction
  | SetHeadAction;

export interface Assert {
  args: any[];
}

export type AssertOrCustom = Assert | Custom;

export interface Chain {
  wsPort: number;
  ws?: string; // if undefined, it fallsback to the default value -> ws://localhost
  paraId?: number;
  skip_block_production?: boolean;
}
export interface ChainConfigs {
  chainName: string;
  ss58Format: number;
}
export interface Connection {
  name: string;
  configs: ChainConfigs;
  api: any;
  provider: any,
  isApiReady: boolean;
  subscriptions: object;
  lastBlock: string;
}

export interface Runtime {
  path: string;
}

export interface Settings {
  chains: { [key: string]: Chain };
  variables: { [key: string]: any };
  runtimes: { [key: string]: Runtime };
  decodedCalls: { [key: string]: Call };
}

export interface PaymentInfo {
  partialFee: any;
  weight: any;
}

export interface Range {
  valid: boolean;
  lowerLimit: BigInt;
  upperLimit: BigInt;
}

export interface CheckerError {
  file: string;
  errors: Array<string>;
}

export interface Interface {
  instance?: any;
  // type?: string;
  type?: string[];
  anyKey?: boolean;
  attributes?: { [key: string]: boolean };
  rule?: object;
}

export interface Assessment {
  parentKey: string | undefined;
  parentRange: any;
  key: string | undefined;
  exist: boolean | undefined;
  rightFormat: boolean | undefined;
  format: string[] | undefined;
  range: any;
}

export interface ParentNode {
  key: string;
  range: any;
}
