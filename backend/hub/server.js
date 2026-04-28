import { configDotenv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we load the .env from the backend root regardless of where node is started
configDotenv({ path: path.join(__dirname, '../.env') });

import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import nacl from 'tweetnacl';
import nacl_util from "tweetnacl-util";
import base58 from 'bs58';
import { Website, Validator, WebsiteTick, DownLog, User } from '../model/model.js';
import db from '../db/db.js';
import nodemailer from "nodemailer";
import axios from 'axios';
import { logEvent } from '../utils/logger.js';
import { syncReputationToChain, logStatusChangeToChain, logHourlySummaryToChain, logValidatorHourlyToChain } from '../blockchain/sync.js';
import { verifyIPLocation } from '../utils/script.js';

const CALLBACKS = {};
const availableValidators = [];
const websiteStates = {}; // Tracks the current state of monitored websites
const COST_PER_VALIDATION = 100; // in lamports
const HUB_PORT = process.env.HUB_PORT || 8081;

// Track frontend dashboard clients (owner browsers) separately from validators
const dashboardClients = new Set();

// Per-validator, per-website last known status — used to detect status changes
// Key: `${validatorId}:${websiteId}` → "Good" | "Bad"
const validatorWebsiteStatus = {};
const wss = new WebSocketServer({ port: HUB_PORT });
console.log(`[HUB] WebSocket server is listening on port ${HUB_PORT}`);

// Consensus configuration
const HIGH_TRUST_THRESHOLD = 70;   // Minimum trustScore to be considered "high-trust"
const TRUST_REWARD = 2;            // Trust points gained for agreeing with consensus
const TRUST_PENALTY = 5;           // Trust points lost for disagreeing
const TRUST_VERIFICATION_BONUS = 3; // Bonus for completing a high-trust verification task

// Notary configuration
const NOTARY_URL = process.env.NOTARY_URL || 'http://localhost:8082';
const NOTARY_SPOT_CHECK_CHANCE = 0.3; // 30% of "Good" reports get notary-verified
const NOTARY_TRUST_BONUS = 3;         // Bonus for passing a notary spot-check
const NOTARY_TRUST_PENALTY = 8;       // Penalty for failing a notary spot-check (higher than consensus penalty)

// Security Mode Toggle
// Set STRICT_MODE=true in .env to enforce IP and Location verification
const STRICT_MODE = process.env.STRICT_MODE === 'true'; 
console.log(`[SECURITY] Raw STRICT_MODE env: "${process.env.STRICT_MODE}"`);
console.log(`[SECURITY] Strict Mode: ${STRICT_MODE ? 'ENABLED (Production)' : 'DISABLED (Test/Simulator Mode)'}`);

const pass = process.env.PASS_NODEMAILER;
const senderEmail = process.env.EMAIL_NODEMAILER;

console.log("Websocket server")
console.log(`[EMAIL] PASS_NODEMAILER loaded: ${pass ? `yes (${pass.length} chars)` : "no"}`);

const logActiveValidators = () => {
    if (!availableValidators.length) {
        console.log("[ACTIVE VALIDATORS] None connected");
        return;
    }
    const ids = availableValidators.map((v) => `${v.validatorId}(${v.location || 'unknown'})`);
    console.log(`[ACTIVE VALIDATORS] ${ids.length} -> ${ids.join(", ")}`);
};

/**
 * Extract a normalized region key from a location string.
 * e.g. "Gharroli, Delhi, IN" -> "delhi, in"
 */
const getRegionKey = (location) => {
    if (!location || location === "Unknown") return "unknown";
    const parts = location.split(",").map(p => p.trim().toLowerCase());
    // Use the last two parts (region, country) for grouping
    if (parts.length >= 2) {
        return parts.slice(-2).join(", ");
    }
    return parts.join(", ");
};

/**
 * Update a validator's trust score (clamped to 0-100)
 */
const updateTrustScore = async (validatorId, delta) => {
    const validator = await Validator.findById(validatorId);
    if (!validator) return;
    const newScore = Math.max(0, Math.min(100, validator.trustScore + delta));
    await Validator.findByIdAndUpdate(validatorId, { trustScore: newScore });
    console.log(`[TRUST] Validator ${validatorId}: ${validator.trustScore} -> ${newScore} (delta: ${delta > 0 ? '+' : ''}${delta})`);
};

// Send email
const transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
        user: senderEmail,
        pass: pass
    }
});

async function sendEmail(userEmail, websiteName, websiteUrl, location, reason) {
    const mailOptions = {
        from: senderEmail,
        to: userEmail,
        subject: `WatchTower Alert: ${websiteName} is DOWN`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4d4d; border-radius: 10px; background-color: #fff5f5;">
                <h2 style="color: #d9534f;">⚠️ Website Down Notification</h2>
                <p>Hello,</p>
                <p>Your website <strong>${websiteName}</strong> (<a href="${websiteUrl}">${websiteUrl}</a>) is currently <strong>DOWN</strong>.</p>
                <p><strong>Reported From:</strong> ${location}</p>
                <p><strong>Reason/Details:</strong></p>
                <pre style="background: #f8f9fa; padding: 10px; border-left: 5px solid #d9534f; overflow-x: auto;">${reason || 'No detailed reason provided'}</pre>
                <p>We will continue to monitor the site and notify you once it recovers.</p>
                <hr>
                <p style="font-size: 0.8em; color: #666;">This is an automated message from WatchTower Monitoring System.</p>
            </div>
        `,
    }
    console.log("[EMAIL] Preparing to send", { ...mailOptions });
    try {
        await transporter.sendMail(mailOptions);
        console.log("[EMAIL] Sent successfully");
    } catch (err) {
        console.log("[EMAIL] Error while sending");
        console.log(err.message);
        console.log(err);
    }
}

wss.on('connection', async (ws) => {
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            // ── Dashboard client handshake ─────────────────────────────────
            if (data.type === 'dashboard-connect') {
                dashboardClients.add(ws);
                console.log(`[HUB] Dashboard client connected. Total: ${dashboardClients.size}`);
                ws.send(JSON.stringify({ type: 'dashboard-connected', data: { message: 'Connected to Hub' } }));
                return;
            }

            if (data.type === 'signup') {
                const verified = await verifyMessage(
                    `Signed message for ${data.data.callbackId}, ${data.data.publicKey}`,
                    data.data.publicKey,
                    data.data.signedMessage
                );
                console.log("Verification started");
                if (verified) {
                    await signupHandler(ws, data.data);
                }
                console.log("Verification completed");
            } else if (data.type === 'validate') {
                CALLBACKS[data.data.callbackId](data);
                delete CALLBACKS[data.data.callbackId];
            }
        } catch (err) {
            console.log(err);
        }
    });

    ws.on('close', () => {
        // Remove from dashboard clients if it was a dashboard connection
        if (dashboardClients.has(ws)) {
            dashboardClients.delete(ws);
            console.log(`[HUB] Dashboard client disconnected. Total: ${dashboardClients.size}`);
            return;
        }

        const index = availableValidators.findIndex(v => v.socket === ws);
        if (index !== -1) {
            const validator = availableValidators[index];
            logEvent({
                category: 'SYSTEM',
                eventType: 'VALIDATOR_DISCONNECTED',
                actorId: validator.validatorId.toString(),
                message: `Validator disconnected from Hub`,
            }).catch(console.error);
            availableValidators.splice(index, 1);
        }
        console.log(`Validator removed from the array`);
        logActiveValidators();
    });
});
async function signupHandler(ws, { ip, publicKey, signedMessage, callbackId, location, latitude, longitude }) {
    console.log(`[DEBUG] signupHandler called for publicKey: ${publicKey.substring(0, 10)}...`);
    
    // Get the REAL physical connection IP
    const connectionIp = ws._socket.remoteAddress.replace('::ffff:', '');
    console.log(`[SECURITY] Connection from real IP: ${connectionIp}`);

        const validatorDb = await Validator.findOne({ publicKey });
        
        if (validatorDb) {
            console.log(`[DEBUG] Validator found in DB: ${validatorDb.name} (${validatorDb._id})`);
            ws.send(JSON.stringify({
                type: 'signup',
                data: {
                    validatorId: validatorDb._id,
                    callbackId,
                },
            }));

            // --- STRICT MODE CHECKS ---
            let finalLocation = validatorDb.location; // Default to verified DB location
            let finalIp = connectionIp; // Use the real physical IP

            if (STRICT_MODE) {
                console.log(`[SECURITY] Strict check for ${validatorDb.name}`);
                
                // 1. Force location from DB (ignore client-reported location)
                if (!validatorDb.location) {
                    ws.send(JSON.stringify({ type: 'signup-error', data: { message: "Validator has no verified location in DB." } }));
                    return;
                }
                finalLocation = validatorDb.location;

                // 2. LIVE Location Verification (GeoIP)
                // We check if the ACTUAL physical location matches the CLAIMED Location in the DB
                const isLocal = connectionIp === '127.0.0.1' || connectionIp === '::1';
                
                // If it's local, we use an empty string for the IP which tells ipinfo.io 
                // to return the location of our own public gateway.
                const checkIp = isLocal ? '' : connectionIp;
                
                const isLocationValid = await verifyIPLocation(checkIp, validatorDb.location);
                
                if (isLocationValid) {
                    console.log(`[SECURITY] ✅ Location Verified for ${validatorDb.name} (${validatorDb.location})`);
                } else {
                    console.log(`[SECURITY] ❌ Location Spoofing Detected! Connection IP: ${connectionIp || 'Local'} is NOT in ${validatorDb.location}`);
                    ws.send(JSON.stringify({ type: 'signup-error', data: { message: `Security Error: Your physical location does not match your registered region (${validatorDb.location}).` } }));
                    return;
                }

                // 3. IP consistency check
                const dbIp = validatorDb.ip;
                if (dbIp && dbIp !== connectionIp && !isLocal) {
                    console.log(`[SECURITY] ❌ IP Mismatch! DB: ${dbIp}, Connect: ${connectionIp}`);
                    ws.send(JSON.stringify({ type: 'signup-error', data: { message: "Security Error: IP mismatch detected." } }));
                    return;
                }
            } else {
                // In Test/Simulator mode, allow the client to report its own location/IP if needed
                finalLocation = validatorDb.location || location || "Unknown";
                finalIp = connectionIp || ip;
            }

        availableValidators.push({
            validatorId: validatorDb._id,
            socket: ws,
            publicKey: validatorDb.publicKey,
            location: finalLocation,
            latitude: validatorDb.latitude || latitude || null,
            longitude: validatorDb.longitude || longitude || null,
            trustScore: validatorDb.trustScore || 50,
            isAdmitted: validatorDb.isAdmitted || false,
            trialStartedAt: validatorDb.trialStartedAt || new Date(),
        });
        
        console.log(`[DEBUG] Validator pushed to availableValidators. Current count: ${availableValidators.length}`);
        
        await logEvent({
            category: 'SYSTEM',
            eventType: 'VALIDATOR_CONNECTED',
            actorId: validatorDb._id.toString(),
            message: `Validator connected to Hub`,
            metadata: { location: validatorDb.location || location, latitude, longitude }
        });
        
        logActiveValidators();
        return;
    }

    console.log(`[DEBUG] Validator NOT FOUND in DB for publicKey: ${publicKey.substring(0, 10)}...`);
    ws.send(JSON.stringify({
        type: 'signup-error',
        data: {
            callbackId,
            message: 'Validator not found. Please register via the app before starting the validator CLI.',
        },
    }));
}

async function verifyMessage(message, publicKey, signature) {
    const messageBytes = nacl_util.decodeUTF8(message);
    const publicKeyBytes = nacl_util.decodeBase64(publicKey); // Decode Base64 public key
    const signatureBytes = new Uint8Array(JSON.parse(signature));

    const result = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
    );

    return result;
}

async function triggerPushoverBuzzer(userKey, websiteName, url, reason) {
    try {
        const formData = new URLSearchParams();
        formData.append('token', process.env.PUSHOVER_APP_TOKEN);
        formData.append('user', userKey);
        formData.append('message', `🚨 WATCHTOWER ALERT: ${websiteName} (${url}) is DOWN!\n\nReason: ${reason}`);
        formData.append('title', "Website Down!");
        formData.append('priority', '2');      // Emergency Priority
        formData.append('retry', '30');        // Minimum retry interval is 30 seconds
        formData.append('expire', '3600');     // Expire after 1 hour
        formData.append('sound', 'WatchTowerSiren'); // Use the user's custom uploaded sound

        await axios.post('https://api.pushover.net/1/messages.json', formData);
        console.log(`[BUZZER] Emergency notification sent to user.`);
    } catch (err) {
        console.error(`[BUZZER] Failed to send Pushover: ${err.message}`);
    }
}

/**
 * Handle the "Down" report finalization after high-trust verification.
 */
async function handleDownReport(website, location, reason, latitude, longitude) {
    const websiteIdStr = website._id.toString();
    const isNewFailure = websiteStates[websiteIdStr] !== "Bad";

    // Always log the technical failure details to the database for historical tracking
    await DownLog.create({
        websiteId: website._id,
        location: location,
        reason: reason || "Unknown failure"
    });

    // Only trigger notifications and "Recent Events" if this is a fresh state change
    if (isNewFailure) {
        console.log(`[CONSENSUS] 🔴 STATE CHANGE: ${website.url} is now DOWN`);
        websiteStates[websiteIdStr] = "Bad";

        const id = await Website.findById(website._id).select("userId");
        const userId = id.userId;
        const mail = await User.findOne({ userId });
        
        if (mail) {
            const userEmail = mail.email;
            const now = new Date();
            const lastEmailSent = website.lastEmailSent || new Date(0);

            // Keep the 1-minute cooldown even for state changes to avoid spamming if a site flickers
            if ((now - lastEmailSent) >= 60 * 1000) {
                console.log("[EMAIL] Sending down notification...");
                await sendEmail(userEmail, website.websiteName, website.url, location, reason);
                await Website.findByIdAndUpdate(website._id, { lastEmailSent: now });
            }

            // Trigger Pushover Buzzer if configured
            if (mail.pushoverUserKey) {
                await triggerPushoverBuzzer(
                    mail.pushoverUserKey, 
                    website.websiteName, 
                    website.url, 
                    reason || "Unknown error"
                );
            }
        }

        await logEvent({
            category: 'WEBSITE',
            eventType: 'STATUS_CHANGED_DOWN',
            targetId: websiteIdStr,
            severity: 'WARN',
            message: `Website went DOWN: ${website.url}`,
            metadata: { reportedLocation: location, reason, latitude, longitude }
        });

        // Phase 3: Event-Driven Blockchain Logging (Good -> Bad)
        await logStatusChangeToChain(websiteIdStr, website.url, "Good", "Bad");
    } else {
        console.log(`[CONSENSUS] ℹ️ Ongoing failure for ${website.url} (already logged)`);
    }
}

/**
 * Request a high-trust validator from the same region to verify a "Down" report.
 * Returns the high-trust validator's result, or null if no high-trust validator is available.
 */
async function requestHighTrustVerification(website, reporterRegion, reporterValidatorId) {
    // Find a high-trust validator in the same region (excluding the original reporter)
    const regionKey = getRegionKey(reporterRegion);
    const highTrustValidator = availableValidators.find(v => {
        const vRegion = getRegionKey(v.location);
        return vRegion === regionKey
            && v.validatorId.toString() !== reporterValidatorId.toString()
            && v.trustScore >= HIGH_TRUST_THRESHOLD;
    });

    if (!highTrustValidator) {
        console.log(`[HIGH-TRUST] No high-trust validator available in region "${regionKey}" for verification.`);
        return null; // No high-trust validator available; fall back to original report
    }

    console.log(`[HIGH-TRUST] Requesting verification from validator ${highTrustValidator.validatorId} (trust: ${highTrustValidator.trustScore}) in region "${regionKey}"`);

    return new Promise((resolve) => {
        const verifyCallbackId = randomUUID();
        const timeout = setTimeout(() => {
            console.log(`[HIGH-TRUST] Verification timed out for ${verifyCallbackId}`);
            delete CALLBACKS[verifyCallbackId];
            resolve(null); // Timed out, treat as unavailable
        }, 15000); // 15 second timeout

        highTrustValidator.socket.send(JSON.stringify({
            type: 'validate',
            data: {
                url: website.url,
                callbackId: verifyCallbackId,
            },
        }));

        CALLBACKS[verifyCallbackId] = async (data) => {
            clearTimeout(timeout);
            const { status, signedMessage } = data.data;
            const verified = await verifyMessage(
                `Replying to ${verifyCallbackId}`,
                highTrustValidator.publicKey,
                signedMessage
            );

            if (!verified) {
                console.log(`[HIGH-TRUST] Signature verification FAILED for validator ${highTrustValidator.validatorId}`);
                resolve(null);
                return;
            }

            // Reward the high-trust validator for completing verification
            await Validator.findByIdAndUpdate(
                highTrustValidator.validatorId,
                {
                    $inc: {
                        pendingPayouts: COST_PER_VALIDATION,
                        totalChecks: 1,
                        successfulVerifications: 1,
                    }
                }
            );
            await updateTrustScore(highTrustValidator.validatorId.toString(), TRUST_VERIFICATION_BONUS);

            console.log(`[HIGH-TRUST] Verification result: ${status} from validator ${highTrustValidator.validatorId}`);
            resolve(status);
        };
    });
}

/**
 * Request the Notary Service to independently verify a URL.
 * Compares the notary's status with the validator's reported status.
 * 
 * @param {string} url - The URL to verify
 * @param {string} validatorStatus - The status reported by the validator ("Good" or "Bad")
 * @returns {Promise<{match: boolean, notaryStatus: string|null}>}
 */
async function requestNotaryVerification(url, validatorStatus) {
    try {
        const response = await axios.post(`${NOTARY_URL}/notarize`, { url }, { timeout: 10000 });
        const { attestation } = response.data;

        if (!attestation) {
            console.log(`[NOTARY] No attestation returned for ${url}`);
            return { match: true, notaryStatus: null }; // Can't verify, assume honest
        }

        // Determine notary's verdict
        const notaryIsGood = attestation.statusCode >= 200 && attestation.statusCode < 400;
        const notaryStatus = notaryIsGood ? 'Good' : 'Bad';

        const match = notaryStatus === validatorStatus;

        console.log(`[NOTARY] URL: ${url} | Validator: ${validatorStatus} | Notary: ${notaryStatus} (HTTP ${attestation.statusCode}) | Match: ${match}`);

        return { match, notaryStatus, attestation: response.data };
    } catch (err) {
        console.log(`[NOTARY] Service unavailable for ${url}: ${err.message}`);
        return { match: true, notaryStatus: null }; // Notary down, assume honest
    }
}

// Website monitoring interval
setInterval(async () => {
    const websitesToMonitor = await Website.find({ disabled: false });

    for (const website of websitesToMonitor) {
        availableValidators.forEach(validator => {
            const callbackId = randomUUID();
            console.log(`Sending validate to ${validator.validatorId} ${website.url}`);
            validator.socket.send(JSON.stringify({
                type: 'validate',
                data: {
                    url: website.url,
                    callbackId
                },
            }));

            CALLBACKS[callbackId] = async (data) => {
                if (data.type === 'validate') {
                    const { validatorId, status, latency, signedMessage, location, reason, latitude, longitude } = data.data;
                    console.log(`Latency : ${latency}`);
                    console.log(`Status : ${status}`);
                    console.log(`Location :  ${location}`);
                    const verified = await verifyMessage(
                        `Replying to ${callbackId}`,
                        validator.publicKey,
                        signedMessage
                    );
                    if (!verified) {
                        return;
                    }

                    // Increment totalChecks for the validator
                    const updatedValidator = await Validator.findByIdAndUpdate(validatorId, {
                        $inc: { totalChecks: 1 }
                    }, { new: true });
                    
                    // Trial Phase Graduation Logic
                    if (!updatedValidator.isAdmitted && updatedValidator.totalChecks >= 500) {
                        const now = new Date();
                        const hoursSinceStart = (now - updatedValidator.trialStartedAt) / (1000 * 60 * 60);
                        
                        if (hoursSinceStart >= 24) {
                            await Validator.findByIdAndUpdate(validatorId, { isAdmitted: true });
                            
                            // Update in-memory state
                            const index = availableValidators.findIndex(v => v.validatorId.toString() === validatorId.toString());
                            if (index !== -1) availableValidators[index].isAdmitted = true;
                            
                            await logEvent({
                                category: 'VALIDATOR',
                                eventType: 'TRIAL_PASSED',
                                severity: 'AUDIT',
                                actorId: validatorId.toString(),
                                message: `Validator passed the trial phase (500 checks + 24 hours) and is now fully admitted.`
                            });
                            console.log(`[TRIAL] ✅ Validator ${validatorId} passed the trial phase!`);
                        }
                    }
                    
                    await logEvent({
                        category: 'VALIDATOR',
                        eventType: 'STATUS_REPORTED',
                        severity: 'DEBUG',
                        actorId: validatorId.toString(),
                        targetId: website._id.toString(),
                        message: `Validator reported ${status} for ${website.url}`,
                        metadata: { status, latency, location }
                    });

                    if (status == "Bad") {
                        console.log(`[CONSENSUS] Validator ${validatorId} reported DOWN for ${website.url}. Initiating high-trust verification...`);

                        // Request high-trust verification before finalizing
                        const highTrustResult = await requestHighTrustVerification(website, location, validatorId);

                        if (highTrustResult === "Bad") {
                            // High-trust validator CONFIRMED the failure
                            console.log(`[CONSENSUS] ✅ DOWN status CONFIRMED by high-trust validator for ${website.url}`);
                            await logEvent({
                                category: 'SYSTEM',
                                eventType: 'CONSENSUS_AGREED',
                                severity: 'AUDIT',
                                targetId: website._id.toString(),
                                message: `DOWN status confirmed by high-trust validator for ${website.url}`
                            });
                            await handleDownReport(website, location, reason, latitude, longitude);

                            // Reward the original reporter for honest reporting
                            await updateTrustScore(validatorId, TRUST_REWARD);
                            await Validator.findByIdAndUpdate(validatorId, {
                                $inc: { successfulVerifications: 1 }
                            });

                        } else if (highTrustResult === "Good") {
                            // High-trust validator DISAGREED — original report was likely false
                            console.log(`[CONSENSUS] ❌ DOWN status REJECTED by high-trust validator for ${website.url}. Penalizing reporter.`);
                            await logEvent({
                                category: 'SYSTEM',
                                eventType: 'CONSENSUS_DISAGREED',
                                severity: 'AUDIT',
                                actorId: validatorId.toString(),
                                targetId: website._id.toString(),
                                message: `DOWN status REJECTED by high-trust validator for ${website.url}. Reporter penalized.`
                            });
                            await updateTrustScore(validatorId, -TRUST_PENALTY);

                        } else {
                            // No high-trust validator available or timed out — accept the original report as fallback
                            console.log(`[CONSENSUS] ⚠️ No high-trust verification available. Accepting original report for ${website.url}`);
                            await handleDownReport(website, location, reason);
                        }
                    } else {
                        // "Good" status — run random notary spot-check
                        const shouldSpotCheck = Math.random() < NOTARY_SPOT_CHECK_CHANCE;

                        if (shouldSpotCheck) {
                            console.log(`[NOTARY] 🔍 Spot-checking validator ${validatorId} for ${website.url}`);
                            const notaryResult = await requestNotaryVerification(website.url, status);

                            if (notaryResult.notaryStatus && !notaryResult.match) {
                                // Notary disagrees! Validator reported "Good" but site is actually down
                                console.log(`[NOTARY] ❌ MISMATCH: Validator ${validatorId} reported Good, Notary says ${notaryResult.notaryStatus} for ${website.url}`);
                                await logEvent({
                                    category: 'SYSTEM',
                                    eventType: 'NOTARY_MISMATCH',
                                    severity: 'CRITICAL',
                                    actorId: validatorId.toString(),
                                    targetId: website._id.toString(),
                                    message: `Validator caught lying by Notary for ${website.url}`
                                });
                                await updateTrustScore(validatorId, -NOTARY_TRUST_PENALTY);
                            } else {
                                // Notary agrees or is unavailable
                                console.log(`[NOTARY] ✅ Validator ${validatorId} passed spot-check for ${website.url}`);
                                await logEvent({
                                    category: 'SYSTEM',
                                    eventType: 'NOTARY_PASSED',
                                    severity: 'AUDIT',
                                    actorId: validatorId.toString(),
                                    targetId: website._id.toString(),
                                    message: `Validator passed Notary spot-check for ${website.url}`
                                });
                                await updateTrustScore(validatorId, NOTARY_TRUST_BONUS);
                                await Validator.findByIdAndUpdate(validatorId, {
                                    $inc: { successfulVerifications: 1 }
                                });
                            }
                        } else {
                            // No spot-check, just reward trust normally
                            await updateTrustScore(validatorId, TRUST_REWARD);
                            await Validator.findByIdAndUpdate(validatorId, {
                                $inc: { successfulVerifications: 1 }
                            });
                        }

                        // Phase 3: Recovery Logging (Bad -> Good)
                        if (websiteStates[website._id.toString()] === "Bad") {
                            console.log(`[CONSENSUS] 🟢 RECOVERY DETECTED: ${website.url} is back online!`);
                            websiteStates[website._id.toString()] = "Good";
                            
                            await logEvent({
                                category: 'WEBSITE',
                                eventType: 'STATUS_CHANGED_UP',
                                targetId: website._id.toString(),
                                severity: 'INFO',
                                message: `Website recovered and is UP: ${website.url}`,
                            });
                            
                            await logStatusChangeToChain(website._id.toString(), website.url, "Bad", "Good");
                        }
                    }

                    // Always create the WebsiteTick record
                    await WebsiteTick.create({
                        websiteId: website._id,
                        validatorId,
                        status,
                        latency,
                        createdAt: new Date(),
                    });

                    // ── Real-time validator status update to dashboard ─────
                    // Only broadcast when the validator's status for THIS site changes
                    const vsKey = `${validatorId}:${website._id.toString()}`;
                    const prevValidatorStatus = validatorWebsiteStatus[vsKey];
                    if (prevValidatorStatus !== status) {
                        validatorWebsiteStatus[vsKey] = status;
                        if (dashboardClients.size > 0) {
                            const updatePayload = JSON.stringify({
                                type: 'validator-status-update',
                                data: {
                                    validatorId: validatorId.toString(),
                                    websiteId: website._id.toString(),
                                    status,          // "Good" or "Bad"
                                    latency,
                                    timestamp: new Date().toISOString(),
                                },
                            });
                            dashboardClients.forEach((client) => {
                                try {
                                    if (client.readyState === 1) { // OPEN
                                        client.send(updatePayload);
                                    }
                                } catch (e) {
                                    console.error('[HUB] Failed to send to dashboard client:', e.message);
                                }
                            });
                            console.log(`[HUB] 📡 Emitted validator-status-update: validator ${validatorId} → ${status} for ${website.url}`);
                        }
                    }

                    // Always pay the validator for their work
                    await Validator.findByIdAndUpdate(
                        validatorId,
                        { $inc: { pendingPayouts: COST_PER_VALIDATION } }
                    );
                }
            };
        });
    }
}, 10 * 1000);

setInterval(() => {
    logActiveValidators();
}, 10 * 1000);

// Phase 3: 12-Hour Reputation Synchronization Engine
// 12 hours = 12 * 60 * 60 * 1000 ms
setInterval(async () => {
    console.log(`[BLOCKCHAIN] Starting 12-hour reputation sync...`);
    const admittedValidators = await Validator.find({ isAdmitted: true });
    
    for (const validator of admittedValidators) {
        await syncReputationToChain(validator._id.toString(), validator.trustScore, validator.totalChecks);
    }
    console.log(`[BLOCKCHAIN] Reputation sync completed for ${admittedValidators.length} validators.`);
}, 12 * 60 * 60 * 1000);

// Phase 4: Hourly Website Health Snapshot
// Runs every 1 hour (60 * 60 * 1000 ms)
setInterval(async () => {
    console.log(`[BLOCKCHAIN] Starting Hourly Website Snapshot sync...`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const websitesToMonitor = await Website.find({ disabled: false });
    
    for (const website of websitesToMonitor) {
        const ticks = await WebsiteTick.find({ 
            websiteId: website._id, 
            createdAt: { $gte: oneHourAgo } 
        });
        
        if (ticks.length > 0) {
            const totalTicks = ticks.length;
            const goodTicks = ticks.filter(t => t.status === "Good").length;
            const badTicks = totalTicks - goodTicks;
            const uptime = (goodTicks / totalTicks) * 100;
            const avgLatency = ticks.reduce((sum, t) => sum + t.latency, 0) / totalTicks;
            
            await logHourlySummaryToChain(website._id.toString(), website.url, uptime, badTicks, avgLatency);
        }
    }
    console.log(`[BLOCKCHAIN] Hourly Website Snapshot sync completed.`);
}, 60 * 60 * 1000);

// Phase 5: Hourly Validator Snapshot
// Runs every 1 hour (60 * 60 * 1000 ms)
setInterval(async () => {
    console.log(`[BLOCKCHAIN] Starting Hourly Validator Snapshot sync...`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const validators = await Validator.find({});
    
    for (const validator of validators) {
        const ticks = await WebsiteTick.find({ 
            validatorId: validator._id, 
            createdAt: { $gte: oneHourAgo } 
        });
        
        if (ticks.length > 0) {
            const totalReports = ticks.length;
            const earnedLamports = totalReports * 100; // REWARD_AMOUNT
            
            // Log to blockchain
            await logValidatorHourlyToChain(validator._id.toString(), earnedLamports, totalReports, totalReports);
        }
    }
    console.log(`[BLOCKCHAIN] Hourly Validator Snapshot sync completed.`);
}, 60 * 60 * 1000);