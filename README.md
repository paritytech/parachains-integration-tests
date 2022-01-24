# Introduction
The goal of this repository is to provide **Integraton Tests** for the **Common & System Parachains** in the Polkadot ecosystem. The tests are run against a locally deployed _Parachain<>Relaychain_  infra using [Polkadot Launch](https://github.com/paritytech/polkadot-launch).

A CLI (which the tests make use of) is also available to interact directly with the chains.

# Versioning
Each _Parachain<>Relaychain_ combination has its own features and configurations. Thus, not all tests are valid for all possible _Parachain<>Relaychain_ combination. Because of it, it is necessary to have different branches for each combination and keep a well structured naming format:

```
release-<parachain_name>-<parachain_version>-<relaychain_name>-<relaychain_version>
```

For example: `release-westmint-v6-westend-v0.9.13` is telling us that:
- `release-v0.9.13` from [Polkadot](https://github.com/paritytech/polkadot/tree/release-v0.9.13)
- `release-statemine-v6` from [Cumulus](https://github.com/paritytech/cumulus/tree/release-statemine-v6)

releases were used to build the `polkadot` (Relay Chain) and `polkadot-collator` (Parachain) binaries

Each release branch will also inlude the `config.json` file that is used to deploy the `polkadot-launch` infra the tests where developed for.

**Note**: The `master` branch of this repository will be up to date with the last release of the _Westmint<>Westend_ combinantion.

# Set up
- Include the `polkadot` and `polkadot-collator` binaries under the `./bin` folder
- `yarn`
# Tests
- To run all tests: `yarn polkadot-launch:test`

- To run individual tests:
    1. `yarn polkadot-launch`
    2. When the Parachain is producing blocks -> Run a specific test from the list below

Implemented tests:

- **xcm** -> `$ yarn test:xcm`
  - `$ yarn test:xcm:limited-teleport-asset` -> Limited Teleport Asset (DMP & UMP)
  - `$ yarn test:xcm:transact` -> Transact (DMP & UMP)

- **assets** -> `$ yarn test:assets`

- **uniques** -> `$ yarn test:uniques`

# Contributions

PRs and contributions are welcome :)