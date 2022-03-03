export interface TestFile {
  name: string
  dir: string
  yaml: TestsConfig
}
export interface TestsConfig {
  settings: Settings,
  tests: Describe[],
}
export interface Describe {
  name: string,
  before?: Before[],
  beforeEach?: BeforeEach[],
  after?: After[],
  afterEach?: AfterEach[],
  its: It[],
  describes?: Describe[] // It is possible to nest Describes
}

export interface Before {
  name?: string
  actions: Action[]
}

export interface BeforeEach  extends Before {}

export interface After  extends Before {}

export interface AfterEach  extends Before {}

export type Hook = Before | BeforeEach | After | AfterEach

export interface Custom {
  path: string
  args: any
}

export interface Query {
  chain: Chain,
  delay?: number;
  pallet: string,
  call: string,
  args: any[],
}

export interface Rpc {
  chain: Chain,
  delay?: number;
  method: string,
  call: string,
  args: any[],
}

export interface Call {
  chain: Chain,
  sudo?: boolean, // if 'true', the call will be wrapped with 'sudo.sudo()'
  pallet: string,
  call: string,
  args: any[],
}

export interface Extrinsic extends Call {
  signer: string,
  delay?: number;
  events: Event[],
}

export interface Event {
  chain: Chain,
  name: string,
  remote: boolean // indicates if its considered as a remote event (different chain context)
  timeout?: number // overrides de default event listener timeout
  attribute?: Attribute
}

export interface EventResult extends Event {
  remote: boolean
  received: boolean
  ok: boolean,
  message: string
  data?: any,
  xcmOutput: XcmOutput
}

export interface XcmOutput {
  expected: string | undefined
  real: string | undefined
}

export interface Attribute {
  type: string,
  value?: any,
  isComplete?: boolean  // only for 'XcmV2TraitsOutcome' type
  isIncomplete?: boolean  // only for 'XcmV2TraitsOutcome' type
  isError?: boolean  // only for 'XcmV2TraitsOutcome' type
}

export interface It {
  name: string,
  actions: Action[]
}

export type ExtrinsicAction = { extrinsics: Extrinsic[] }
export type QueryAction = { queries: { [key: string]: Query } }
export type RpcAction = { rpcs: { [key: string]: Rpc } }
export type AsserAction = { asserts: { [key: string]: AssertOrCustom } }
export type CustomAction = { customs: Custom[] }

export type Action = ExtrinsicAction | QueryAction | AsserAction | RpcAction | CustomAction 

export interface Assert {
  args: any[],
}

export type AssertOrCustom = Assert | Custom

export interface Chain {
  wsPort: number
  ws?: string // if undefined, it fallsback to the default value -> ws://localhost
}
export interface Settings {
  chains: { [key: string]: Chain }
  variables: { [key: string]: any }
  decodedCalls: { [key: string]: Call }
}

export interface PaymentInfo {
  partialFee: any,
  weight: any
}