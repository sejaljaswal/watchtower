import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load the backend environment variables first
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../backend/.env") });

async function run() {
    // Dynamic imports to ensure dotenv is loaded before backend files are evaluated
    const { Validator, WebsiteTick } = await import("../backend/model/model.js");
    const { logValidatorHourlyToChain } = await import("../backend/blockchain/sync.js");
    const db = (await import("../backend/db/db.js")).default;

    console.log("Waiting for database connection...");
    
    // Give Mongoose a second to establish the connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Fetching a validator from the database...");
    const validator = await Validator.findOne();
    
    if (!validator) {
        console.error("No validator found in the database!");
        process.exit(1);
    }
    
    // Fetch some stats for the hourly summary
    const totalReports = await WebsiteTick.countDocuments({ validatorId: validator._id });
    const earnedLamports = totalReports * 100; // Mock calculation
    const correctReports = totalReports; // Mock assumption for test
    
    console.log(`Found Validator ID: ${validator._id}`);
    console.log(`Stats to sync: Earned ${earnedLamports}, Total Reports: ${totalReports}`);
    console.log("\n🚀 Forcing HOURLY SNAPSHOT sync to Solana Devnet...");
    
    // Call the exact same function the Hub's cron job uses
    const success = await logValidatorHourlyToChain(
        validator._id.toString(),
        earnedLamports,
        totalReports,
        correctReports
    );
    
    if (success) {
        console.log("\n✅ Hourly Snapshot script completed successfully!");
    } else {
        console.log("\n❌ Hourly Snapshot script failed to upload to the blockchain.");
    }
    
    process.exit(0);
}

run();
