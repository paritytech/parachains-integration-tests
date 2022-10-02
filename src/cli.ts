#!/usr/bin/env node

import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { Command, Option } from 'commander';
import {
  DEFAULT_EVENT_LISTENER_TIMEOUT,
  DEFAULT_ACTION_DELAY,
  DEFAULT_TIMEOUT,
} from './constants';
var pjson = require('../package.json');

const program = new Command();

const p: { [key: string]: ChildProcess } = {};

export function killAll() {
  console.log('\nKilling all processes...');
  for (const key of Object.keys(p)) {
    p[key].kill();
  }
}

const spawnPolkadotLaunch = (options) => {
  let stdio = 'inherit';
  let stdioLogs;

  if (options.chainLogs) {
    const polkadotLaunchLogs = fs.openSync(`${options.chainLogs}`, 'a');
    stdioLogs = ['inherit', polkadotLaunchLogs, polkadotLaunchLogs];
  }

  p['polkadot-launch'] = spawn('polkadot-launch', [options.config], {
    stdio: options.chainLogs ? stdioLogs : stdio,
    detached: false,
  });
};

const spawnZombienet = (options) => {
  let stdio = 'inherit';
  let stdioLogs;

  if (options.chainLogs) {
    const zombienetLogs = fs.openSync(`${options.chainLogs}`, 'a');
    stdioLogs = ['inherit', zombienetLogs, zombienetLogs];
  }

  p['zombienet'] = spawn(
    'zombienet',
    ['-p', 'native', 'spawn', options.config],
    {
      stdio: options.chainLogs ? stdioLogs : stdio,
      detached: false,
    }
  );
};

const spawnTests = (options) => {
  let runnerExtension = 'js';
  runnerExtension = options.env === 'dev' ? 'ts' : runnerExtension;

  let stdio = 'inherit';
  let stdioLogs;

  if (options.testLogs) {
    const testLogs = fs.openSync(`${options.testLogs}`, 'a');
    stdioLogs = ['inherit', testLogs, testLogs];
  }

  p['mocha'] = spawn(
    'mocha',
    [
      '--timeout 100000',
      '--exit',
      '-r',
      'ts-node/register',
      `${__dirname}/run.${runnerExtension}`,
    ],
    {
      stdio: options.testLogs ? stdioLogs : stdio,
      detached: false,
      env: {
        ...process.env,
        TS_NODE_COMPILER_OPTIONS: '{"module": "commonjs" }',
        TESTS_PATH: options.tests,
        TIMEOUT: options.timeout,
        EVENT_LISTENER_TIMEOUT: options.eventListenerTimeout,
        QUERY_DELAY: options.actionDelay,
        ENV: options.env,
      },
    }
  );
};

program
  .name('parachains-integrations-tests')
  .description('Tool for testing integration between Parachains')
  .version(pjson);

program
  .addOption(
    new Option('-e, --env <environment>', 'environment')
      .choices(['dev', 'prod'])
      .default('prod')
  )
  .addOption(
    new Option('-m, --mode <mode>', 'mode to run')
      .choices([
        'test',
        'zombienet',
        'zombienet-test',
        'polkadot-launch',
        'polkadot-launch-test',
      ])
      .makeOptionMandatory()
  )
  .addOption(new Option('-c, --config <path>', 'path to zombienet config file'))
  .addOption(new Option('-t, --tests <path>', 'path to tests'))
  .addOption(
    new Option('-to, --timeout <millisecons>', 'tests timeout')
      .default(DEFAULT_TIMEOUT)
      .argParser(parseInt)
  )
  .addOption(
    new Option(
      '-el, --event-listener-timeout <millisecons>',
      'events listener timeout'
    )
      .default(DEFAULT_EVENT_LISTENER_TIMEOUT)
      .argParser(parseInt)
  )
  .addOption(
    new Option('-ad, --action-delay <millisecons>', 'delay before actions')
      .default(DEFAULT_ACTION_DELAY)
      .argParser(parseInt)
  )
  .addOption(
    new Option(
      '-cl, --chain-logs <log_file_name>',
      'log file for chains deployment'
    )
  )
  .addOption(
    new Option('-tl, --test-logs <log_file_name>', 'log file for tests')
  );

program.parse(process.argv);
let options = program.opts();

if (options.mode === 'zombienet-test') {
  program
    .addOption(
      new Option(
        '-c, --config <path>',
        'path to zombienet config file'
      ).makeOptionMandatory()
    )
    .addOption(
      new Option('-t, --tests <path>', 'path to tests').makeOptionMandatory()
    );
  program.parse(process.argv);
  spawnZombienet(options);
  spawnTests(options);
} else if (options.mode === 'zombienet') {
  program.addOption(
    new Option(
      '-c, --config <path>',
      'path to zombienet config file'
    ).makeOptionMandatory()
  );
  program.parse(process.argv);
  spawnZombienet(options);
} else if (options.mode === 'polkadot-launch-test') {
  program
    .addOption(
      new Option(
        '-c, --config <path>',
        'path to polkadot-launch config file'
      ).makeOptionMandatory()
    )
    .addOption(
      new Option('-t, --tests <path>', 'path to tests').makeOptionMandatory()
    );
  program.parse(process.argv);
  spawnPolkadotLaunch(options);
  spawnTests(options);
} else if (options.mode === 'polkadot-launch') {
  program.addOption(
    new Option(
      '-c, --config <path>',
      'path to zombienet config file'
    ).makeOptionMandatory()
  );
  program.parse(process.argv);
  spawnPolkadotLaunch(options);
} else if (options.mode === 'test') {
  program.addOption(
    new Option('-t, --tests <path>', 'path to tests').makeOptionMandatory()
  );
  program.parse(process.argv);
  spawnTests(options);
}

process.on('exit', function () {
  killAll();
});

process.on('SIGINT', function () {
  process.exit(2);
});
