#!/bin/bash

tests=(
  statemine
)

for t in ${tests[@]}
do
  yarn test -t ./tests/$t/ -c ./tests/$t/config.json
done

./stop.sh