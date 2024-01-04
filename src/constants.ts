import { YAMLMap, YAMLSeq } from 'yaml';
import { Interface } from './interfaces';

export const DEFAULT_TIMEOUT = 300000;
export const DEFAULT_EVENT_LISTENER_TIMEOUT = 200000;
export const DEFAULT_EVENT_LISTENER_TIMEOUT_CHOPSTICKS = 50000;
// export const DEFAULT_EVENT_LISTENER_TIMEOUT = 40000;
// export const DEFAULT_ACTION_DELAY = 40000;
export const DEFAULT_ACTION_DELAY = 0;
export const REGISTERED_ASSERTIONS = [
  'custom',
  'equal',
  'deepEqual',
  'balanceDecreased',
  'balanceIncreased',
  'assetsDecreased',
  'assetsIncreased',
  'isNone',
  'isSome',
];

export const CHOPSTICKS_MODE = 'chopsticks';
export const ZOMBIENET_MODE = 'zombienet';

export const INTERFACE: { [key: string]: Interface } = {
  root: {
    instance: YAMLMap,
    attributes: {
      YAMLdocument: true,
    },
  },
  YAMLdocument: {
    instance: YAMLMap,
    attributes: {
      settings: true,
      tests: true,
    },
  },
  settings: {
    instance: YAMLMap,
    attributes: {
      chains: true,
      variables: false,
      decodedCalls: false,
      runtimes: false,
    },
  },
  chains: {
    instance: YAMLMap,
    attributes: {
      wsPort: true,
      ws: false,
      paraId: false,
    },
    anyKey: true,
  },
  variables: {
    instance: YAMLMap,
    anyKey: true,
  },
  decodedCalls: {
    instance: YAMLMap,
    attributes: {
      chain: true,
      pallet: true,
      call: true,
      args: true,
      sudo: false,
      encode: false,
      delay: false,
      events: false,
    },
    anyKey: true,
  },
  runtimes: {
    instance: YAMLMap,
    attributes: {
      path: true,
    },
    anyKey: true,
  },
  tests: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      its: false,
      path: false,
      before: false,
      beforeEach: false,
      after: false,
      afterEach: false,
      describes: false,
    },
  },
  describes: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      its: false,
      before: false,
      beforeEach: false,
      after: false,
      afterEach: false,
      describes: false,
    },
  },
  name: {
    type: ['string'],
  },
  its: {
    instance: YAMLSeq,
    attributes: {
      name: true,
      actions: true,
    },
  },
  actions: {
    instance: YAMLSeq,
    attributes: {
      extrinsics: false,
      customs: false,
      asserts: false,
      queries: false,
      rpcs: false,
      block_travels: false,
      time_travels: false,
      set_storages: false,
      set_heads: false,
    },
  },
  extrinsics: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      signer: true,
      pallet: true,
      call: true,
      args: true,
      sudo: false,
      encode: false,
      delay: false,
      events: false,
    },
  },
  chain: {
    instance: YAMLMap,
    attributes: {
      wsPort: true,
      ws: false,
      paraId: false,
    },
  },
  wsPort: {
    type: ['number'],
  },
  ws: {
    type: ['string'],
  },
  paraId: {
    type: ['number'],
  },
  pallet: {
    type: ['string'],
  },
  method: {
    type: ['string'],
  },
  call: {
    type: ['string'],
  },
  sudo: {
    type: ['boolean'],
  },
  encode: {
    type: ['boolean'],
  },
  signer: {
    type: ['string'],
  },
  delay: {
    type: ['number'],
  },
  events: {
    instance: YAMLSeq,
    attributes: {
      chain: false,
      name: true,
      remote: false,
      timeout: false,
      result: false,
      threshold: false,
      strict: false,
      attributes: false,
    },
  },
  remote: {
    type: ['boolean'],
  },
  timeout: {
    type: ['number'],
  },
  result: {
    type: ['object'],
  },
  strict: {
    type: ['boolean'],
  },
  attributes: {
    instance: YAMLSeq,
    attributes: {
      type: false,
      key: false,
      isRange: false,
      threshold: false,
      value: false,
      xcmOutcome: false,
    },
    rule: {
      or: ['type', 'key'],
    },
  },
  type: {
    type: ['string'],
  },
  key: {
    type: ['string'],
  },
  isRange: {
    type: ['boolean'],
  },
  threshold: {
    type: ['any'],
  },
  value: {
    type: ['any'],
  },
  xcmOutcome: {
    type: ['string'],
  },
  customs: {
    instance: YAMLSeq,
    attributes: {
      path: true,
      args: true,
      events: false,
    },
  },
  path: {
    type: ['string'],
  },
  args: {
    instance: YAMLSeq,
  },
  asserts: {
    instance: YAMLMap,
    attributes: {
      equal: false,
      isSome: false,
      balanceDecreased: false,
      balanceIncreased: false,
      assetsDecreased: false,
      assetsIncreased: false,
      custom: false,
    },
  },
  equal: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  isSome: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  balanceDecreased: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  balanceIncreased: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  assetsDecreased: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  assetsIncreased: {
    instance: YAMLMap,
    attributes: {
      args: true,
    },
  },
  custom: {
    instance: YAMLMap,
    attributes: {
      path: true,
      args: true,
    },
  },
  queries: {
    instance: YAMLMap,
    anyKey: true,
    attributes: {
      chain: true,
      delay: false,
      pallet: true,
      call: true,
      args: true,
    },
  },
  rpcs: {
    instance: YAMLMap,
    anyKey: true,
    attributes: {
      chain: true,
      delay: false,
      method: true,
      call: true,
      args: true,
      events: false,
    },
  },
  block_travels: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      count: false,
      to: false,
      events: false,
    },
    rule: {
      or: ['count', 'to'],
    },
  },
  time_travels: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      date: true,
      events: false,
    },
  },
  set_storages: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      storage: true,
      events: false,
    },
  },
  set_heads: {
    instance: YAMLSeq,
    attributes: {
      chain: true,
      block: true,
      events: false,
    },
  },
  count: {
    type: ['number'],
  },
  to: {
    type: ['number'],
  },
  date: {
    type: ['number', 'string'],
  },
  storage: {
    type: ['object'],
  },
  block: {
    type: ['number', 'string'],
  },
  before: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true,
    },
  },
  beforeEach: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true,
    },
  },
  after: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true,
    },
  },
  afterEach: {
    instance: YAMLSeq,
    attributes: {
      name: false,
      actions: true,
    },
  },
};
