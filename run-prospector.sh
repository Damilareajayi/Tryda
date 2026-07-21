#!/bin/bash

# Navigate to the agent workspace
cd /home/ajayidamilarefelix/Tryda/agent

# Set correct Playwright browsers path (using the /tmp partition)
export PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Run the Prospector agent
npm run prospect
