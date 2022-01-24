#!/bin/bash

yarn polkadot-launch:test & pid=$!

wait $pid

echo "---------- TESTS STARTS ----------"

yarn test