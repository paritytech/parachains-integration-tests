import { spawn } from 'child_process';
import { Command } from 'commander';
const program = new Command();

const main = async () => {
  program
  .name('parachains-integrations-tests')
  .description('Tool for testing integration between Parachains')
  .version('1.0.0');

  program
    .option('-c, --config <path>', 'path to polkadot-launch config file')
    .requiredOption('-t, --tests <path>', 'path to tests')
    .option('-to, --timeout <time>', 'timeout for tests');

  program.parse(process.argv);

  const options = program.opts();

  if (options.config) {
    spawn(
      "./node_modules/.bin/polkadot-launch", 
      [options.config], {
      stdio: 'inherit',
      detached: false,
    });
  }

  spawn(
    "./node_modules/.bin/mocha", 
    ['--timeout 100000', '-r', 'ts-node/register', 'src/run.ts'], {
    stdio: 'inherit',
    detached: false,
    env: {
      ...process.env,
      TS_NODE_COMPILER_OPTIONS: '{\"module\": \"commonjs\" }',
      TESTS_PATH: options.tests,
      TIMEOUT: options.timeout ? options.timeout : 100000
    }
  });
}

main()