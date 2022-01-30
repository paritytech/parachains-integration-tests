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
  its?: It[],
  describes?: Describe[]
  custom?: Custom 
}

export interface Before {
  custom?: Custom
  extrinsics?: Extrinsic[]
}

export interface BeforeEach  extends Before {}

export interface After  extends Before {}

export interface AfterEach  extends Before {}

export interface Custom {
  path: string
  args?: any[]
}

export interface Query {
  chain: string,
  pallet: string,
  call: string,
  args: any[],
}

export interface Call {
  chain: string,
  pallet: string,
  call: string,
  args: any[],
}

export interface Extrinsic extends Call {
  chain: string,
  signer: string,
  events?: Event[],
  queries: { [key: string]: Query }
}

export interface Event {
  chain?: string,
  name: string,
  attribute?: Attribute
}

export interface Attribute {
  type: string,
  value: any
}

export interface It {
  name: string,
  extrinsics?: Extrinsic[],
  events?: Event[],
  asserts?: Assert[]
}

export interface Assert {
  type: string,
  args: any[],
  path?: string,
}

export interface Settings {
  chains: { [key: string]: string }
  variables: { [key: string]: any }
  encodedCalls: { [key: string]: Call }
}
export interface EventResult {
  ok: boolean,
  message: string
}