/**
 * Debug script to test error classification
 */

import { httpGet, ErrorType, HttpServiceError, getHttpStats } from "../server/_core/httpService.ts";

async function testErrorClassification() {
  console.log("Testing 404 error classification...\n");

  try {
    await httpGet("https://httpbin.org/status/404");
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.log("✅ Error is HttpServiceError");
      console.log(`   Type: ${error.detail.type}`);
      console.log(`   Expected: ${ErrorType.CLIENT_ERROR}`);
      console.log(`   Match: ${error.detail.type === ErrorType.CLIENT_ERROR ? "✅" : "❌"}`);
      
      console.log(`\n   Status Code: ${error.detail.statusCode}`);
      console.log(`   Expected: 404`);
      console.log(`   Match: ${error.detail.statusCode === 404 ? "✅" : "❌"}`);
      
      console.log(`\n   Message: ${error.detail.message}`);
    } else {
      console.log("❌ Error is not HttpServiceError");
      console.log("   Error:", error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Error breakdown from stats:");
  const stats = getHttpStats();
  console.log(JSON.stringify(stats.errorBreakdown, null, 2));
}

testErrorClassification().catch(console.error);
