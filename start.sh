#!/bin/bash
./stop.sh

yarn polkadot-launch:test & pid=$!

wait $pid

echo "---------- TESTS START ----------"

yarn test & pid2=$!

wait $pid2

./stop.sh

killall -9 polkadot
killall -9 polkadot-collator