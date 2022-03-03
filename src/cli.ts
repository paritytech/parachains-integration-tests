import { spawn } from 'child_process';
import { Command, Option } from 'commander';
import { DEFAULT_EVENT_LISTENER_TIMEOUT, DEFAULT_ACTION_DELAY, DEFAULT_TIMEOUT } from './constants';
const program = new Command();

const spawnPolkadotLaunch = (options) => {
  spawn(
    "./node_modules/.bin/polkadot-launch", 
    [options.config], {
    stdio: 'inherit',
    detached: false,
  });
}

const spawnTests = (options) => {
  spawn(
    "./node_modules/.bin/mocha", 
    ['--timeout 100000', '--exit', '-r', 'ts-node/register', 'src/run.ts'], {
    stdio: 'inherit',
    detached: false,
    env: {
      ...process.env,
      TS_NODE_COMPILER_OPTIONS: '{\"module\": \"commonjs\" }',
      TESTS_PATH: options.tests,
      TIMEOUT: options.timeout,
      EVENT_LISTENER_TIMEOUT: options.eventListenerTimeout,
      QUERY_DELAY: options.actionDelay,
    }
  });
}

const main = async () => {
  program
  .name('parachains-integrations-tests')
  .description('Tool for testing integration between Parachains')
  .version('1.0.0');

  program
    .addOption(new Option('-m, --mode <mode>', 'polkadot-launch, test or both').choices(['polkadot-launch', 'test','polkadot-launch-test']).makeOptionMandatory())
    .addOption(new Option('-c, --config <path>', 'path to polkadot-launch config file'))
    .addOption(new Option('-t, --tests <path>', 'path to tests'))
    .addOption(new Option('-to, --timeout <millisecons>', 'tests timeout').default(DEFAULT_TIMEOUT).argParser(parseInt))
    .addOption(new Option('-el, --event-listener-timeout <millisecons>', 'events listener timeout').default(DEFAULT_EVENT_LISTENER_TIMEOUT).argParser(parseInt))
    .addOption(new Option('-ad, --action-delay <millisecons>', 'delay before actions').default(DEFAULT_ACTION_DELAY).argParser(parseInt))
  
  program.parse(process.argv);
  let options = program.opts();

  if (options.mode === 'polkadot-launch-test') {
    program
      .addOption(new Option('-c, --config <path>', 'path to polkadot-launch config file').makeOptionMandatory())
      .addOption(new Option('-t, --tests <path>', 'path to tests').makeOptionMandatory())
    
    program.parse(process.argv);
    spawnPolkadotLaunch(options)
    spawnTests(options)

  } else if (options.mode === 'polkadot-launch') {
    program
      .addOption(new Option('-c, --config <path>', 'path to polkadot-launch config file').makeOptionMandatory())
    
    program.parse(process.argv);
    spawnPolkadotLaunch(options)

  } else if (options.mode === 'test') {
    program
      .addOption(new Option('-t, --tests <path>', 'path to tests').makeOptionMandatory())
    
    program.parse(process.argv);
    spawnTests(options)
  }
}

main()