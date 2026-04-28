import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load the backend environment variables first
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

async function run() {
    const { Validator } = await import("../backend/model/model.js");
    const { syncReputationToChain } = await import("../backend/blockchain/sync.js");
    const db = (await import("../backend/db/db.js")).default;
    console.log("Waiting for database connection...");
    
    // Give Mongoose a second to establish the connection from db.js
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Fetching a validator from the database...");
    const validator = await Validator.findOne();
    
    if (!validator) {
        console.error("No validator found in the database!");
        process.exit(1);
    }
    
    console.log(`Found Validator ID: ${validator._id}`);
    console.log(`Trust Score: ${validator.trustScore || 100}, Total Checks: ${validator.totalChecks || 0}`);
    console.log("\n🚀 Forcing reputation sync to Solana Devnet...");
    
    // Call the exact same function the Hub uses
    const success = await syncReputationToChain(
        validator._id.toString(), 
        validator.trustScore || 100, 
        validator.totalChecks || 0
    );
    
    if (success) {
        console.log("\n✅ Script completed successfully!");
    } else {
        console.log("\n❌ Script failed to upload to the blockchain.");
    }
    
    process.exit(0);
}

run();
