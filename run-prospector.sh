#!/bin/bash

# Navigate to the agent workspace
cd /home/ajayidamilarefelix/Tryda/agent

# Load NVM and configure Node path for cron environment
export NVM_DIR="/usr/local/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="/usr/local/nvm/versions/node/v24.16.0/bin:$PATH"

# Set correct Playwright browsers path (using the /tmp partition)
export PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Run the Prospector agent
npm run prospect
