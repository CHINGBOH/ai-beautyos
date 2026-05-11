/**
 * Debug script to test timeout error
 */

import { httpGet, ErrorType, HttpServiceError } from "../server/_core/httpService.ts";

async function testTimeout() {
  console.log("Testing timeout error...\n");

  try {
    await httpGet("https://httpbin.org/delay/10", {
      timeout: 1000, // 1 秒超时
    });
  } catch (error) {
    if (error instanceof HttpServiceError) {
      console.log("✅ Error is HttpServiceError");
      console.log(`   Type: ${error.detail.type}`);
      console.log(`   Expected: ${ErrorType.TIMEOUT}`);
      console.log(`   Match: ${error.detail.type === ErrorType.TIMEOUT ? "✅" : "❌"}`);
      
      console.log(`\n   Message: ${error.detail.message}`);
    } else {
      console.log("❌ Error is not HttpServiceError");
      console.log("   Error:", error);
    }
  }
}

testTimeout().catch(console.error);
