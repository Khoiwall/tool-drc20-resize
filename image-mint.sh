#!/bin/bash

# check that 2 arguments are passed in otherwise exit
if [ "$#" -ne 2 ]; then
    echo "Illegal number of parameters"
    echo "Usage: image-mint.sh <target_address> <file_name>"
    exit 1
fi

target_address=$1
file_name=$2

# start mint
node . wallet sync
node . mint "$target_address" "$file_name"
sleep 300 #sleep for 5 minutes

# loop continuously until "pending-txs.json" is gone
while [ -f "pending-txs.json" ]; do
    echo "Mint incomplete, retrying..."
    
    # retry command
    node . wallet sync

echo "Stop spamming, Dogecoin is sick. Sleeping..."
    sleep 300 # Wait for 5 minutes before checking again
done

echo "All transactions broadcasted. Exiting minter. Please wait for confirmation before minting again."
