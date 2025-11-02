// tools/test-price-service.js
require('dotenv').config(); // Load environment variables from .env file at the project root

const path = require('path');
// Adjust the path to correctly point to priceService.js from the tools directory
const { getPrices, disconnect } = require(
  path.resolve(__dirname, '..', 'services/priceService.js')
);

const tickersToTest = ['INTC', 'GOOGL'];

async function testApi() {
  console.log(
    `[TEST] Attempting to fetch prices for: ${tickersToTest.join(', ')}`
  );
  console.log(
    `[TEST] Using API Key 1 ending in: ${process.env.FINNHUB_API_KEY ? '...' + process.env.FINNHUB_API_KEY.slice(-4) : 'Not Set'}`
  );
  if (process.env.FINNHUB_API_KEY_2) {
    console.log(
      `[TEST] Using API Key 2 ending in: ${'...' + process.env.FINNHUB_API_KEY_2.slice(-4)}`
    );
  }
  console.log(
    `[TEST] API Call Limit set in .env: ${process.env.API_CALLS_PER_MINUTE || 'Not Set (Defaults based on key count)'}`
  );

  try {
    // Using a neutral priority (5) like the batch endpoint does
    const results = await getPrices(tickersToTest, 5);

    console.log('\n--- Results ---');
    tickersToTest.forEach((ticker) => {
      if (results[ticker]) {
        const { price, timestamp } = results[ticker];
        const timeString = new Date(timestamp).toLocaleTimeString();
        if (price === 'invalid') {
          console.log(`${ticker}: Invalid ticker or no data found.`);
        } else if (price === null || price === 'error') {
          console.log(`${ticker}: Error fetching price.`);
        } else {
          console.log(`${ticker}: ${price} (Fetched/Cached at ${timeString})`);
        }
      } else {
        console.log(`${ticker}: No data returned.`);
      }
    });
    console.log('---------------\n');
  } catch (error) {
    console.error('\n--- ERROR ---');
    console.error(`[TEST] An error occurred during the test: ${error.message}`);
    console.error(error.stack);
    console.log('-------------\n');
  } finally {
    console.log('[TEST] Disconnecting price service...');
    await disconnect(); // Important to allow the script to exit cleanly
    console.log('[TEST] Finished.');
  }
}

testApi();
