# Parachains Integration Tests ✅ 
Since the arrival of XCMP, communication between different consensus systems became a reality in the Polkadot's ecosystem.  _Parachains Integration Tests_ is a tool that was created with the ambtion of easing testing interactions between Substrate based blockchains that implement XCMP.

This tool allows you to develop tests radipdly describing them in a YAML file. Behind the scenes, the YAML files are converted to [Mocha](https://mochajs.org/) tests.

It can work alongside with [Polkadot Launch](https://github.com/paritytech/polkadot-launch), or you can run your tests against the testnet of your preference.

Under the `./test` folder, this repository includes integration tests for the _Common Good Assets Parachains_ (Statemine & Statemint). You can take them as examples of how to write tests with this tool.

## YAML Schema
It is formed by two main sections: `settings` and `tests`.

```yaml
settings:
  # Declaration of the chains the tests should connect to
  chains: # { [key: string]: Chain }
  # Arbitrary declaration of constants to be used across the tets
  variables: # { [key: string]: any }
  # Calls that want to be encoded to be used in the tests
  decodedCalls: # { [key: string]: Call }

tests: # Describe[]
```

```typescript
export interface TestsConfig {
  settings: Settings;
  tests: Describe[];
}
```
### Settings
- `chains`: connection values for all the different chains we want to connect to. Defining `wsPort` should be enough unless you want to override the default `ws` URL (ws://localhost).

- `variables`: section that allows you to define your own variables following the schema that better suits your tests logic. 

- `decodedCalls`: declaration of the different calls you want to calculate their econded call hex value. Each result is stored in a variable that will become available in the rest of the file ONLY after its declaration. The way to access those variables is appending a `$` symbol to the defined `decodedCalls` key. For instance, in the following example, the encoded call result for `my_call_id` will be accesible from `$my_call_id`

**Example**:
```yaml
settings: # Settings
  chains:
    my_chain_id: &relay_chain # a Relay Chain, for instance
      wsPort: 9966
      ws: ws://my-custom-url
    my_other_chain_id: &parachain # a Parachain, for instance
      wsPort: 9988
      # It is also possible to add the variables that you consider
      # are useful and related to the chain
      for_example_paraId: &paraId 2000

  variables:
    my_variable: &my_variable 0x0011
    my_arbitrary_schema: &my_schema
      object:
        a: 1
        b: 2

  decodedCalls:
    my_call_id:
        chain: *relay_chain
        pallet: system
        call: remark
        args: [ *my_variable ]
```

**Interfaces**:

```typescript
interface Settings {
  chains: { [key: string]: Chain };
  variables: { [key: string]: any };
  decodedCalls: { [key: string]: Call };
}
```

```typescript
interface Chain {
  wsPort: number;
  ws?: string; // if 'undefined', it fallback to the default value -> ws://localhost
}
```

```typescript
interface Call {
  chain: Chain;
  sudo?: boolean; // if 'true', the call will be wrapped with 'sudo.sudo()'
  pallet: string;
  call: string;
  args: any[];
}
```

### Tests
Tests are formed by an array of _Describe_ interfaces. Tests can be nested through the `describes` attribute.

**Example**:

```yaml
tests: # Describe[]
  - name: My Describe
    before: # Before[]
      - name: 'before' description to console log
        actions: [...]
    beforeEach: ... # BeforeEach[]
    after: ... # After[]
    afterEach: ... # AfterEach[]
    its: # It[]
      - name: It should do something
        actions: [...]
    describes: # Describe[]
      - name: My nested Describe

  - name: My other Describe          
    its: [...] # It[]
```

**Interfaces**:
```typescript
interface Describe {
  name: string;
  before?: Before[];
  beforeEach?: BeforeEach[];
  after?: After[];
  afterEach?: AfterEach[];
  its: It[];
  describes?: Describe[]; // It is possible to nest Describes
}
```

#### Hook & It
Both have a similar interface. They are formed by a `name` for descriptions and by the `actions` attribute.

The available hooks are: `before`, `beforeEach`, `after` and `afterEach`

**Example**:

```yaml
tests: # Describe[]
  - name: My Describe
    before: # Before[]
      - name: 'before' description to console log
        actions: [...] # Action[]
      - name: another description for a 'before'
        actions: [...] # Action[]
    its: # It[]
      - name: It should do something
        actions: [...] # Action[]
      - name: It should not do something
        actions: [...] # Action[]
    ...
```

**Interfaces**
```typescript
type Hook = Before | BeforeEach | After | AfterEach

 // Same for BeforeEach, After, AfterEach
interface Before {
  name?: string; // optional description
  actions: Action[];
}
```

```typescript
interface It {
  name: string;
  actions: Action[];
}
```

#### Action ###
There are five available actions types that can be performed inside a _Hook_ or an _It_: `extrinsics`, `queries`, `rpcs`, `asserts` and `customs`. The order they are executed depends on the order they are defined in the _Action_ array. Since `actions` is an array, multiple actions of the same type can be declared.

**Example**:

```yaml
tests: # Describe[]
  - name: My Describe
    before: # Before[]
      - name: 'before' description to console log
        actions: # Action[]
          - extrinsics: [...] # Extrinsic[]
          - queries: [...] # Query[]
          - ...
    its: # It[]
      - name: It should do something
        actions: # Action[]
          - extrinsics: [...] # Extrinsic[]
          - rpcs: [...] # RPC[]
          - asserts: [...] # Assert[]
          - customs: [...] # Custom[]
          - queries: [...] # Query []
          - asserts: [...] # Assert[]
    ...
```

**Interfaces**

```typescript
export type ExtrinsicAction = { 
  extrinsics: Extrinsic[];
}

export type QueryAction = { 
  queries: { [key: string]: Query };
}

export type RpcAction = { 
  rpcs: { [key: string]: Rpc }; 
}

export type AsserAction = { 
  asserts: { [key: string]: AssertOrCustom };
}

export type CustomAction = { 
  customs: Custom[];
}

export type Action = ExtrinsicAction | QueryAction | AsserAction | RpcAction | CustomAction;
```

```typescript

```

#### Extrinsic

**Example**:

```yaml
settings:
  chains:
    relay_chain: &relay_chain
      wsPort: 9900
    parachain: &parachain
      wsPort: 9910
      paraId: &id 2000  

  variables:
    common:
      require_weight_at_most: &weight_at_most 1000000000    
    relay_chain:
      signer: &signer //Alice
      parachain_destination: &dest { v1: { 0, interior: { x1: { parachain: *id }}}} 
  
  decodedCalls:
    force_create_asset:
      chain: *parachain
      pallet: assets
      call: forceCreate
      args: [
        1, # assetId
        { # owner
          Id: HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F 
        }, 
        true, # isSufficient
        1000 # minBalance
      ]

tests: # Describe[]
  - name: My Describe
    its: # It[]
      - name: It should do something
        actions: # Action[]
          - extrinsics:
            - chain: *relay_chain # Chain
              signer: *signer
              sudo: true
              pallet: xcmPallet
              call: send
              args: [ 
                *ap_dest, # destination 
                { 
                  v2: [ # message
                    { 
                      Transact: { 
                        originType: Superuser, 
                        requireWeightAtMost: *weight_at_most, 
                        call: $force_create_asset # enconded call hex
                      }
                    }
                  ]  
                }
              ]  
    ...
```

**Interfaces**

```typescript
interface Extrinsic extends Call {
  signer: string;
  events: Event[];
}
```

## Set Up
```bash
yarn
```
## Contributions

PRs and contributions are welcome :)