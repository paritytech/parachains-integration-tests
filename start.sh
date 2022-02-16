#!/bin/bash

tests=(
  statemine
  statemint
)

for t in ${tests[@]}
do
  # yarn test -t ./tests/$t/ -c ./tests/$t/config.json
  yarn test -t ./tests/$t/
done

./stop.sh