import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { logEvent } from "../utils/logger.js";
import chalk from "chalk";

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Load Admin Keypair
let adminKeypair;
try {
    const secretKeyArray = JSON.parse(process.env.ADMIN_PRIVATE_KEY);
    adminKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
    console.log(`[BLOCKCHAIN] Admin wallet loaded: ${adminKeypair.publicKey.toString()}`);
} catch (e) {
    console.warn("[BLOCKCHAIN] No valid admin keypair found in .env. Blockchain sync will be simulated.");
}

const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
const wsUrl = rpcUrl.startsWith("https://") ? rpcUrl.replace("https://", "wss://") : undefined;
const connection = new Connection(rpcUrl, { wsEndpoint: wsUrl, commitment: "confirmed" });
const fallbackConnection = new Connection(process.env.FALLBACK_RPC_URL || "https://api.devnet.solana.com", "confirmed");

async function sendEvidenceTransaction(message) {
    if (!adminKeypair) return null;
    
    // Make the memo completely unique to prevent "Duplicate Transaction" blockhash errors
    const uniqueMessage = `${message} | TS: ${Date.now()}`;
    
    // Use both Alchemy and fallback
    const connections = [connection, fallbackConnection];
    
    for (const conn of connections) {
        try {
            const balance = await conn.getBalance(adminKeypair.publicKey);
            if (balance === 0) continue;

            const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

            const transaction = new Transaction({
                recentBlockhash: blockhash,
                feePayer: adminKeypair.publicKey
            });

            // 1. Priority Fees (Production standard to ensure inclusion during congestion)
            transaction.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 10000 // 0.00001 SOL premium per CU
                })
            );

            // 2. Add Memo (Provides the readable data)
            transaction.add(
                new TransactionInstruction({
                    keys: [{ pubkey: adminKeypair.publicKey, isSigner: true, isWritable: false }],
                    programId: MEMO_PROGRAM_ID,
                    data: Buffer.from(uniqueMessage, "utf-8"),
                })
            );

            // Send transaction (Do not wait for block confirmation to bypass Alchemy WebSocket errors)
            const signature = await conn.sendTransaction(transaction, [adminKeypair]);

            return signature;
        } catch (err) {
            console.warn(chalk.yellow(`[BLOCKCHAIN WARNING] Attempt failed on ${conn.rpcEndpoint}: ${err.message}`));
        }
    }
    return null;
}

export async function syncReputationToChain(validatorId, trustScore, totalChecks) {
    try {
        const message = `WatchTower: Validator ${validatorId} Reputation Update. Score: ${trustScore}, Total Checks: ${totalChecks}`;
        console.log(`[BLOCKCHAIN] Syncing reputation...`);
        
        const signature = await sendEvidenceTransaction(message);
        
        if (signature) {
            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            console.log(chalk.cyan(`[BLOCKCHAIN] ✅ Reputation Synced! View on Explorer: ${explorerUrl}`));
        }

        await logEvent({
            category: 'SYSTEM',
            eventType: 'BLOCKCHAIN_SYNC',
            severity: 'AUDIT',
            actorId: validatorId,
            message: `Successfully synced reputation to blockchain for ${validatorId}`,
            metadata: { signature }
        });

        return true;
    } catch (err) {
        console.error(`[BLOCKCHAIN ERROR] Failed to sync reputation:`, err);
        return false;
    }
}

export async function logStatusChangeToChain(websiteId, websiteUrl, oldStatus, newStatus) {
    try {
        const message = `WatchTower: Website ${websiteUrl} Status Change: ${oldStatus} -> ${newStatus}`;
        console.log(`[BLOCKCHAIN] Logging status change...`);
        
        const signature = await sendEvidenceTransaction(message);
        
        if (signature) {
            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            console.log(chalk.cyan(`[BLOCKCHAIN] ✅ Status Change Logged! View on Explorer: ${explorerUrl}`));
        }

        await logEvent({
            category: 'SYSTEM',
            eventType: 'BLOCKCHAIN_LEDGER',
            severity: 'AUDIT',
            targetId: websiteId,
            message: `Logged status change (${oldStatus} -> ${newStatus}) to blockchain for ${websiteUrl}`,
            metadata: { signature }
        });

        return true;
    } catch (err) {
        console.error(`[BLOCKCHAIN ERROR] Failed to log status change:`, err);
        return false;
    }
}

export async function logHourlySummaryToChain(websiteId, websiteUrl, uptime, downChecks, avgLatency) {
    try {
        const message = `WatchTower Hourly: ${websiteUrl} | Uptime: ${uptime.toFixed(2)}% | Down: ${downChecks} | Latency: ${Math.round(avgLatency)}ms`;
        console.log(`[BLOCKCHAIN] Logging hourly summary...`);
        
        const signature = await sendEvidenceTransaction(message);
        
        if (signature) {
            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            console.log(chalk.magenta(`[BLOCKCHAIN] ⏳ Hourly Summary Logged! View on Explorer: ${explorerUrl}`));
        }

        await logEvent({
            category: 'SYSTEM',
            eventType: 'BLOCKCHAIN_HOURLY_SUMMARY',
            severity: 'AUDIT',
            targetId: websiteId,
            message: `Hourly on-chain snapshot: ${uptime.toFixed(2)}% uptime, ${downChecks} down checks.`,
            metadata: { signature, uptime, downChecks, avgLatency }
        });

        return true;
    } catch (err) {
        console.error(`[BLOCKCHAIN ERROR] Failed to log hourly summary:`, err);
        return false;
    }
}

export async function logValidatorHourlyToChain(validatorId, earnedLamports, totalReports, correctReports) {
    try {
        const message = `WatchTower Validator: ${validatorId} | Earned: ${earnedLamports} | Reports: ${totalReports} | Correct: ${correctReports}`;
        console.log(`[BLOCKCHAIN] Logging validator hourly summary...`);
        
        const signature = await sendEvidenceTransaction(message);
        
        if (signature) {
            const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
            console.log(chalk.magenta(`[BLOCKCHAIN] ⏳ Validator Hourly Logged: ${explorerUrl}`));
        }

        await logEvent({
            category: 'VALIDATOR',
            eventType: 'BLOCKCHAIN_VALIDATOR_HOURLY',
            severity: 'AUDIT',
            actorId: validatorId,
            message: `Hourly on-chain snapshot: Earned ${earnedLamports} lamports.`,
            metadata: { signature, earnedLamports, totalReports, correctReports }
        });

        return true;
    } catch (err) {
        console.error(`[BLOCKCHAIN ERROR] Failed to log validator hourly:`, err);
        return false;
    }
}
