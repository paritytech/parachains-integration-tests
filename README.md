Parachains Integration Tests is a tool that was created to ease testing interactions between Substrate based blockchains.
Since the arrival of XCM, communications between different consensus systems became real in the Polkadot's ecosystem.

This tool allows you to develop tests radipdly describing them in a YAML file. Behind the scenes, the YAML files are converted to (Mocha)[https://mochajs.org/] tests.

It can work alongside with (Polkadot Launch)[https://github.com/paritytech/polkadot-launch], or you can connect your tests to the testnet of your choice.

# Set Up
```bash
yarn
```
# YAML Schema
There are two main sections: `settings` and `tests`.

```yaml
settings:
  chains: # key(<chain_id>) -> value(Chain)
  variables: # Arbitrary declaration of constants that are used (or reused) across the tets
  decodedCalls: # key(<decoded_call_id>) -> value(Call)

tests: # array of Describe interfaces
```

```typescript
export interface TestsConfig {
  settings: Settings,
  tests: Describe[],
}
```
## Settings
```yaml
settings: # Settings
  chains:
    my_chain_id: &relay_chain # a Relay Chain, for instance
      wsPort: 9966
      ws: ws://my-custom-url
    my_other_chain_id: &parachain # a Parachain, for instance
      wsPort: 9988

  variables:
    my_variable: &my_variable { concrete: { 0, interior: { here: true }}}

  decodedCalls:
    my_call_id:
        chain: *relay_chain
        pallet: system
        call: remark
        args: [ 0x0011 ]
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
  ws?: string; // if undefined, it fallsback to the default value -> ws://localhost
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

## Tests

```yaml
tests: # Describe[]
  - name: My Describe
    before: # Before[]
      - name: 'before' description to console log
        actions: [...]
    beforeEach: ... # BeforeEach[]
    after: ... # After[]
    afterEach: ... # AfterEach[]
    its: [...] # It[]
    describes:
      - name: My nested Describe
  - name: My other Describe          
    its: []  
```

```typescript
interface Describe {
  name: string,
  before?: Before[],
  beforeEach?: BeforeEach[],
  after?: After[],
  afterEach?: AfterEach[],
  its: It[],
  describes?: Describe[]
}
```



# Contributions

PRs and contributions are welcome :)