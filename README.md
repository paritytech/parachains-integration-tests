# Parachains Integration Tests  ✅ 
Since the arrival of XCMP-Lite, communication between different consensus systems became a reality in the Polkadot's ecosystem.  _Parachains Integration Tests_ is a tool that was created with the ambtion of easing testing interactions between Substrate based blockchains.

This tool allows you to develop tests radipdly describing them in a YAML file. Behind the scenes, the YAML files are converted to [Mocha](https://mochajs.org/) tests with [Chai](https://www.chaijs.com/) assertions.

It can work alongside with [Zombienet](https://github.com/paritytech/zombienet) and [Polkadot Launch](https://github.com/paritytech/polkadot-launch), or you can run your tests against the testnet of your choice.

Under the `./examples` folder, this repository contains integration tests for the _Common Good Assets Parachains_ (Statemine & Statemint). You can take them as examples of how to write tests with this tool.

## Set Up
It can be installed to be run in two different ways:
- Installing the npm package `parachains-integration-tests` globally
  ```
  yarn global add parachains-integration-tests
  ```
- From the repository
  ```
  yarn
  ```

## How to use
The tool implements a simple CLI.
```
parachains-integration-tests -m <mode> -c <path> -t <path> -to <millisecons> -el <milliseconds> -qd <milliseconds>
```
- `-e`, `--env`:
  - `prod`: for compiled TypeScript to Javascript (default)
  - `dev`: for development environment in TypeScript
- `-m`, `--mode`:
  - `test`: for running your tests
  - `zombienet`: only deploy a Zombienet network
  - `zombienet-test`: deploy a Zombienet testnet and run your tests against it
  - `polkadot-launch`: only deploy a Polkadot Launch network
  - `polkadot-launch-test`: deploy a Polkadot Launch testnet and run your tests against it
- `-c`, `--config`: path to the Zombienet or Polkadot Launch config file.
- `-t`, `--test`: path to the tests folder or to a single test yaml file. All files under the _path_ with a `yml` extension  will be run. To choose the order, is necessary to add an index in front of the file name. E.g: `0_my_test.yml`, `1_my_other_test.yml`
- `-to`, `--timeout`: overrides the default Mocha tests timeout set to `300000`
- `-el`, `--event-listener-timeout`: overrides the default event listener timeout set to `40000`
- `-ad`, `--action-delay`: delay before state queries, rpc calls and extrinsics. Overrides the default delay set to `40000`. Some delay is necessary to make sure the state is already updated. In the case of extrisics, it is also necessary until ID hashes are available in [XCM v3](https://github.com/paritytech/polkadot/pull/4756). Without an indentifier, it is not posible to distinguish what XCM message event was triggered as a result of a specific extrinsic from another chain/context. For this reason, it is necessary to add a big delay between XCM messages, to avoid interferences from other unrelated events.
- `-cl`, `--chain-logs`: path to the log file to redirect stdout and stderr from the testnets deployment tool, either Zombienet or Polkadot Launch.
- `-tl`, `--test-logs`: path to the log file to redirect stdout and stderr from this testing tool.

Examples:
- **NPM package**
  - Run tests using other testnet
      ```
      parachains-integration-tests -m test -t <tests_path>
      ```

  - Only deploy a testnet with Zombienet
      ```
      parachains-integration-tests -m zombienet -c <zombienet_config_path>
      ```

  - Run tests using Zombinet as testnet
      ```
      parachains-integration-tests -m zombienet-test -t <tests_path> -c <zombienet_config_path>
      ```

- **From the repository**
  - Run tests using other testnet
      ```
      yarn test -t <tests_path>
      ```

  - Only deploy a testnet with Zombienet
      ```
      yarn zombienet -c <zombienet_config_path>
      ```

  - Run tests using  as testnet
      ```
      yarn zombienet-test -t <tests_path> -c <zombienet_config_path>
      ```

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

Example:
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

Example:

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

Interfaces:
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

### Hook & It
Both have a similar interface. They are formed by a `name` for descriptions and by the `actions` attribute.

The available hooks are: `before`, `beforeEach`, `after` and `afterEach`

Example:

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

Interfaces:
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

### Action
There are five available actions types that can be performed inside a _Hook_ or an _It_: `extrinsics`, `queries`, `rpcs`, `asserts` and `customs`. The order they are executed depends on the order they are defined in the _Action_ array. Since `actions` is an array, multiple actions of the same type can be declared.

Example:

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

Interfaces:

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

### Extrinsic
Extends the _Call_ interface adding two new attributes: `signer` (indispensable) and `events` (optional). A _Extrinsic_ by itself will not perform any chai assertion. Assertions are build based on the `events` that the extrinsic is expetected to trigger. Each event defined under the `events` attribute will build and perform its corresponding chai assertion.

Example:

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
          - extrinsics: # Extrinsic[]
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
              events: [...] 
    ...
```

Interfaces:

```typescript
interface Call {
  chain: Chain;
  sudo?: boolean; // if 'true', the call will be wrapped with 'sudo.sudo()'
  pallet: string;
  call: string;
  args: any[];
}

interface Extrinsic extends Call {
  signer: string;
  delay?: number; // Overrides the default action delay
  events: Event[];
}
```

### Event
If the `chain` attribute is not defined, it means the event is expected to happpen in the same chain context where the extrinsic was dispatched and as a result of it. Otherwise, the `chain` attribute referring to another context must be defined.

Default event listener timeout can be overriden by the `timeout` attribute.

Example:

```yaml
settings:
  chains:
    relay_chain: &relay_chain
      wsPort: 9900
    parachain: &parachain
      wsPort: 9910
  variables:
    ...
  encodedCalls:
    my_encoded_call:
      ...

tests: # Describe[]
  - name: My Describe
    its: # It[]
      - name: It should do something
        actions: # Action[]
          - extrinsics: # Extrinsic[]
           - chain: *relay_chain
              signer: *signer
              sudo: true
              pallet: xcmPallet
              call: send
              args: [ 
                *dest, # destination 
                { 
                  v2: [ #message
                    { 
                      Transact: { 
                        originType: Superuser, 
                        requireWeightAtMost: *weight_at_most, 
                        call: $my_encoded_call
                      }  
                    }
                  ] 
                }
              ]  
              events: # Event[]
                - name: sudo.Sudid
                  attribute:
                    type: Result<Null, SpRuntimeDispatchError>
                    value: Ok
                - name: xcmPallet.Sent
                - name: dmpQueue.ExecutedDownward
                  chain: *parachain
                  attribute:
                    type: XcmV2TraitsOutcome
                    isComplete: true
                    value: 2,000,000,000
                - name: polkadotXcm.Sent
                  chain: *parachain
                - name: ump.ExecutedUpward
                  timeout: 40000
                  attribute:
                    type: XcmV2TraitsOutcome
                    isComplete: true
                    value: 4,000,000,000
    ...
```

Interfaces:

```typescript
interface Event {
  chain: Chain;
  name: string;
  remote: boolean; // indicates the event is considered as a remote (different chain context)
  timeout?: number; // overrides de default event listener timeout
  attribute?: Attribute;
}
```

```typescript
interface Attribute {
  type: string;
  value?: any;
  isComplete?: boolean; // only for 'XcmV2TraitsOutcome' type
  isIncomplete?: boolean; // only for 'XcmV2TraitsOutcome' type
  isError?: boolean; // only for 'XcmV2TraitsOutcome' type
}
```

### Query
Query the chain state. The result of the query will be stored in a new variable based on the key name of the _Query_. The variable naming follows the same format of `decodedCalls`. Therefore, for the followig example, the result of the query is stored in: `$balance_sender_before`. The variable becomes available in the rest of the file ONLY after its declaration.

Example:

```yaml
settings:
  chains:
    relay_chain: &relay_chain
      wsPort: 9900

  variables:
    ...
  encodedCalls:
    ...
tests: # Describe[]
  - name: My Describe      
    before: # Before[]
      - name: Get the balance of an account
        actions: # Action[]
          - queries: # { key: Query }
              balance_sender_before:
                chain: *relay_chain
                pallet: system
                call: account
                args: [ 
                  HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F 
                ]
    its: [...]           
```

Interfaces:

```typescript
interface Query {
  chain: Chain;
  delay?: number;
  pallet: string;
  call: string;
  args: any[];
}
```

### Rpc
RPC call to the chain's node. Same approach as _Query_. For the following example, the result of the RPC call will be stored in `$block`.

Example:

```yaml
settings:
  chains:
    relay_chain: &relay_chain
      wsPort: 9900

  variables:
    ...
  encodedCalls:
    ...
tests: # Describe[]
  - name: My Describe      
    before: # Before[]
      - name: Get the last block
        actions: # Action[]
          - rpcs: # { key: Rpc }
              block:
                chain: *relay_chain
                method: chain
                call: getBlock
                args: []
    its: [...]           
```

Interfaces:

```typescript
interface Rpc {
  chain: Chain;
  delay?: number;
  method: string;
  call: string;
  args: any[];
}
```

### Assert
Unlike _Query_ and _Rpc_ where their keys can be arbitrarily chosen to generate a new variable, _AssertOrCustom_ keys can only be chosen from a list of built-in asserts.
- `equal`: it has a single attribute `args` which is expecting an array of two values to be `deepEqual()` compared.
- `isNone`: the argument is null.
  - `./src/asserts/isNone.ts`
- `isSome`: the argument is not null.
  - `./src/asserts/isSome.ts`
-  `balanceDecreased`: compares balances queried with `system.account`. If `amount` and `fees` are not inclueded as arguments, it will just check that `after` is lower than `before`
    - `./src/asserts/balanceDecreased.ts`
- `balanceEncreased`: compares balances queried with `system.account`. If `amount` and `fees`(only for XCM messages) are not inclueded as arguments, it will just check that `after` is bigger than `before`
  - `./src/asserts/balanceDecreased.ts`
-  `assetsDecreased`: compares balances queried with `assets.account`. If `amount` and `fees` are not inclueded as arguments, it will just check that `after` is lower than `before`
    - `./src/asserts/assetsDecreased.ts`
- `balanceEncreased`: compares balances queried with `assets.account`. If `amount` and `fees`(only for XCM messages) are not inclueded as arguments, it will just check that `after` is bigger than `before`
  - `./src/asserts/assetsDecreased.ts`
- `custom`: assertion cases can be endless, therefore they are diffucult to standarize. `custom` solves that issue providing the `path` argument. Its value should point to a file where the desired asserts are performed based on the provided `args`. It can not be any kind of file though, and it should export a specific function signature. To learn more about this files see [Custom](#custom).

These methods are extensible opening a PR to include them:
1. Add a new assertion key to `REGISTERED_ASSERTIONS` in `./src/constants.ts`
2. Add a new assertion file under `./src/asserts`. The filename needs to match with the previously registered assertion key .

Example:

```yaml
settings:
  chains:
    relay_chain: &relay_chain
      wsPort: 9900

  variables:
    relay_chain:
      sender: &sender HNZata7iMYWmk5RvZRTiAsSDhV8366zq2YGb3tLH5Upf74F
    ...
  encodedCalls:
    ...
tests: # Describe[]
  - name: My Describe      
    before: # Before[]
      - name: Get the balance of an account before an event
        actions:
          - queries:
              balance_sender_before:
                chain: *relay_chain
                pallet: system
                call: account
                args: [ 
                  *sender 
                ]
    after: # After[]
      - name: Get the balance of an account after an event
        actions:
          - queries:
              balance_sender_after:
                chain: *relay_chain
                pallet: system
                call: account
                args: [ 
                  *sender 
                ]            
    its: # It[]
      - name: Something happens here than modifies the balance
        actions: [...]
      - name: Should reduce the balance of the sender
        actions: # Action[]
          - asserts: # { [key: string]: AssertOrCustom }
              custom:
                path: ./asserts/checkSenderBalances.ts
                args: 
                  { 
                    balances: { 
                      before: $balance_rc_sender_before,
                      after: $balance_rc_sender_after,
                    },
                    amount: *amount,
                  }
              equal:
                args: [true, true]      
```

Interfaces:

```typescript
interface Assert {
  args: any[];
}

interface Custom {
  path: string;
  args: any;
}

type AssertOrCustom = Assert | Custom;
```

### Custom

This _Action_ type enables the possibility of referring to your own files to perform those actions that a constrained YAML schema can not provide. The file must export a very specific function signature that the tool is expecting to import: `async (context, ...args)`
- `context`: corresponds to the test's `this` object. All user created variables (in `encodedCalls`, `queries` and `rpcs`) are stored and accessible from the `this.variables` key. In a similar way, `context` can be use to stored new variables that will become available in the rest of the tests.
- `args`: the arguments used as input for your custom file function.

The following example shows how to use a `custom` action to perform an assertion, but there are not limitations about what to achive.

Example:

```yaml
settings:
  ...
tests: # Describe[]
  - name: My Describe
    before: # I declare $coin_symbol
    its: # It[]
      ...
      - name: My custom action should do something
        actions: # Action[]
          custom: # Custom[]
            - path: ./queryExternalOracle.ts
              args: {
                url: https://www.my-oracle.com/price/
              }
          asserts:
            equal: [$dot_price, 30]

```
```typescript
// queryExternalOracle.ts

const myCustomFunction = async (context, ...args) => {
  const { url } = args[0]

  let coinSymbol = context.variables.$coin_symbol
  
  let price = myApi.get(url + coinSymbol)

  // Save the result in context (this) variables
  // to make it available for the rests of the tests
  context.variables['$dot_price'] = price
}

export default myCustomFunction
```

Interfaces:

```typescript
interface Custom {
  path: string;
  args: any;
}
```

## Get Help
Open an [issue](https://github.com/NachoPal/parachains-integration-tests/issues) if you have problems.

## Contributions
PRs and contributions are welcome :)