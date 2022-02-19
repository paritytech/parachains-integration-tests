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
  // customs?: Custom[]
  // extrinsics?: Extrinsic[]
}

export interface BeforeEach  extends Before {}

export interface After  extends Before {}

export interface AfterEach  extends Before {}

export interface Custom {
  type: 'custom'
  path: string
  args: any[]
}

export interface Query {
  chain: Chain,
  pallet: string,
  call: string,
  args: any[],
}

export interface Call {
  chain: Chain,
  pallet: string,
  call: string,
  args: any[],
}

export interface Extrinsic extends Call {
  signer: string,
  sudo?: boolean
  events: Event[],
  // queries?: { [key: string]: Query }
}

export interface Event {
  chain: Chain,
  name: string,
  attribute: Attribute
}

export interface EventResult extends Event {
  local: boolean
  received: boolean
  ok: boolean,
  message: string
  data?: any,
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
  // customs?: Custom[]
  // extrinsics?: Extrinsic[]
  // queries?: { [key: string]: Query }
  // asserts?: { [key: string]: AssertOrCustom }
}

// export interface Action {
//   extrinsics?: Extrinsic[]
//   customs?: Custom[]
//   queries?: { [key: string]: Query }
//   asserts?: { [key: string]: AssertOrCustom }
// }

export type CustomAction = { customs: Custom[] }
export type ExtrinsicAction = { extrinsics: Extrinsic[] }
export type QueryAction = { queries: { [key: string]: Query } }
export type AsserAction = { asserts: { [key: string]: AssertOrCustom } }

export type Action = CustomAction | QueryAction | ExtrinsicAction | AsserAction

export interface Assert {
  type: 'assert'
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