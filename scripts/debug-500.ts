/**
 * Debug script to test 500 error retry
 */

import { httpGet, ErrorType, HttpServiceError } from "../server/_core/httpService.ts";

async function test500Error() {
  console.log("Testing 500 error retry...\n");

  try {
    await httpGet("https://httpbin.org/status/500", {
      retries: {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 500,
      },
    });
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.log("✅ Error is HttpServiceError");
      console.log(`   Type: ${error.detail.type}`);
      console.log(`   Expected: ${ErrorType.SERVER_ERROR}`);
      console.log(`   Match: ${error.detail.type === ErrorType.SERVER_ERROR ? "✅" : "❌"}`);
      
      console.log(`\n   Status Code: ${error.detail.statusCode}`);
      console.log(`   Expected: 500`);
      console.log(`   Match: ${error.detail.statusCode === 500 ? "✅" : "❌"}`);
      
      console.log(`\n   Retry Attempt: ${error.detail.retryAttempt}`);
      console.log(`   Expected: >= 0`);
      console.log(`   Match: ${error.detail.retryAttempt !== undefined ? "✅" : "❌"}`);
      
      console.log(`\n   Message: ${error.detail.message}`);
    } else {
      console.log("❌ Error is not HttpServiceError");
      console.log("   Error:", error);
    }
  }
}

test500Error().catch(console.error);
