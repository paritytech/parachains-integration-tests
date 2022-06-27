#!/bin/bash

## For Testing a single folder with Polkadot Launch
# yarn start -m polkadot-launch-test -t <path_test> -c <path_config>

## For Testing a single folder without Polkadot Launch
# yarn start -m test -t <path_test>
# yarn tests -t <path_test>

## For only Polkadot Launch
# yarn start -m polkadot-launch -c <config_test>
# yarn polkadot-launch -c <path_test>

tests=(
  statemine
  statemint
)

rm -R logs &> /dev/null
find . -name "*.log" -exec rm '{}' &> /dev/null \;

for t in ${tests[@]}
do
  printf "\n🔍  Running $t tests...\n\n"

  mkdir logs &> /dev/null
  mkdir logs/$t
  
  yarn zombienet -c ./examples/runtimes/$t/config.json &> ./logs/$t/zombienet.log&
  
  yarn test -t ./examples/runtimes/$t/ &> ./logs/$t/tests.log & tests=$!

  cat ./logs/$t/tests.log

  wait $tests

  ./stop.sh

  find . -name "*.log" -maxdepth 1 -exec cp {} logs/$t &> /dev/null \; -exec rm '{}' \;
done