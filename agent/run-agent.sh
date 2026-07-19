#!/bin/bash

# Navigate to the Tryda agent directory
cd /home/ajayidamilarefelix/Tryda/agent

# Load NVM (Node Version Manager) to ensure Node and npm are available in the cron environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Set the required Playwright browser path and trigger the agent
export PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers
npm start >> /home/ajayidamilarefelix/Tryda/agent/agent-run.log 2>&1
