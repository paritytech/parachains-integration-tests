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
  describes?: Describe[]
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
  pallet: string,
  call: string,
  args: any[],
}

export interface Call {
  chain: Chain,
  sudo?: boolean,
  pallet: string,
  call: string,
  args: any[],
}

export interface Extrinsic extends Call {
  signer: string,
  events: Event[],
}

export interface Event {
  chain: Chain,
  name: string,
  remote: boolean
  timeout?: number
  attribute?: Attribute
}

export interface EventResult extends Event {
  remote: boolean
  received: boolean
  ok: boolean,
  message: string
  data?: any,
  xcmOutput: XcmOutput
  id: number
}

export interface XcmOutput {
  expected: string | undefined
  real: string | undefined
}

export interface Attribute {
  type: string,
  value: any,
  isComplete: boolean
  isIncomplete: boolean
  isError: boolean
}

export interface It {
  name: string,
  actions: Action[]
}

export type CustomAction = { customs: Custom[] }
export type ExtrinsicAction = { extrinsics: Extrinsic[] }
export type QueryAction = { queries: { [key: string]: Query } }
export type AsserAction = { asserts: { [key: string]: AssertOrCustom } }

export type Action = CustomAction | QueryAction | ExtrinsicAction | AsserAction

export interface Assert {
  args: any[],
}

export type AssertOrCustom = Assert | Custom

export interface Chain {
  wsPort: number
  ws?: string
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