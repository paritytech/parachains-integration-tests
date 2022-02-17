#!/bin/bash

# For Testing a single folder with Polkadot Launch
# yarn test -t ./tests/$t/ -c ./tests/$t/config.json

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
  
  yarn polkadot-launch -c ./tests/$t/config.json &> ./logs/$t/polkadot-launch.log&
  # yarn test -t ./tests/$t/
  yarn test -t ./tests/$t/ &> ./logs/$t/tests.log & tests=$!

  wait $tests

  ./stop.sh

  find . -name "*.log" -exec cp {} logs/$t &> /dev/null \; -exec rm '{}' \;
done


