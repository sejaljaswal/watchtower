import express from "express";
import db from "./db/db.js";
import {
  Website,
  Validator,
  WebsiteTick,
  User,
  DownLog,
  EventLog,
} from "./model/model.js";
import { authenticateValidator } from "./middleware.js";
import jwt from "jsonwebtoken";
import cors from "cors";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { configDotenv } from "dotenv";
import bs58 from "bs58";
import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import { verifyIPLocation } from "./utils/script.js";
import { logEvent } from "./utils/logger.js";
import { clerkMiddleware, requireAuth } from '@clerk/express'
configDotenv();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const RPC_URL = process.env.RPC_URL;
const ADMIN_PUBLIC_KEY = process.env.ADMIN_PUBLIC_KEY;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// User Creation
app.post("/user", async (req, res) => {
  try {
    let user = await User.findOne({ userId: req.body.userId });
    if (!user) {
      user = await User.create({
        email: req.body.email,
        userId: req.body.userId
      });
      await logEvent({
        category: 'USER',
        eventType: 'USER_SIGNUP',
        actorId: user.userId,
        message: `User signed up: ${user.email}`,
      });
      res.status(201).json(user);
    } else {
      res.status(200).json(user);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Pushover Key
app.put("/user/pushover", async (req, res) => {
  try {
    const userId = req.header('userId');
    const { pushoverUserKey } = req.body;
    const user = await User.findOneAndUpdate(
      { userId },
      { pushoverUserKey },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    await logEvent({
      category: 'USER',
      eventType: 'USER_SETTINGS_UPDATED',
      actorId: userId,
      message: `User updated Pushover settings`,
    });

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Validator Creation
app.post("/validator", async (req, res) => {
  try {
    const { name, email, payoutPublicKey, publicKey, location, ip, password, latitude, longitude } =
      req.body;
    const publicKeyDB = await Validator.findOne({
      payoutPublicKey: payoutPublicKey,
    }).select("payoutPublicKey");
    const emailDB = await Validator.findOne({ email: email }).select("email");
    console.log("Public key : ", publicKeyDB);
    console.log("Email : ", emailDB);
    if (publicKeyDB) {
      return res.status(400).json({
        message: "Your public key already exits",
      });
    }
    if (emailDB) {
      return res.status(400).json({
        message: "Your email already exits",
      });
    }
    const isValidLocation = await verifyIPLocation(ip, location);
    if (!isValidLocation) {
      return res.status(400).json({
        message: "The provided IP address do not match with your location",
      });
    }
    let hashedPassword = await bcrypt.hash(password, 10);
    const validator = await Validator.create({
      name: name,
      email: email,
      publicKey: publicKey,
      location: location,
      ip: ip,
      latitude: latitude,
      longitude: longitude,
      payoutPublicKey: payoutPublicKey,
      password: hashedPassword,
    });

    await logEvent({
      category: 'VALIDATOR',
      eventType: 'VALIDATOR_SIGNUP',
      actorId: validator._id.toString(),
      message: `Validator signed up: ${name} from ${location}`,
      metadata: { ip, payoutPublicKey }
    });

    res.status(201).json(validator);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Validator SignIn
app.post("/validator-signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const getUser = await Validator.findOne({ email: email });
    if (!getUser) {
      return res.status(400).json({
        message: "Validator not found. SignUp to become a validator",
      });
    }
    const decodedPassword = await bcrypt.compare(password, getUser.password);
    if (!decodedPassword) {
      return res.status(404).json({
        message: "Invalid credentails",
      });
    }
    const token = jwt.sign({ userId: getUser._id }, JWT_SECRET);
    return res.status(200).json({
      token: token,
    });
  } catch (err) {
    console.log("Error in Signin");
    res.status(400).json({
      message: "Error while SignIn",
    });
  }
});

// ── GET /website/:id/validators ──────────────────────────────────────────────
// Returns all validators that have ever checked this website, with their
// latest reported status, location, and coordinates. Used for the live map.
app.get("/website/:id/validators", async (req, res) => {
  try {
    const websiteId = req.params.id;

    // Get the latest tick for each unique validator that checked this website
    const latestTicks = await WebsiteTick.aggregate([
      { $match: { websiteId: websiteId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$validatorId",
          latestStatus: { $first: "$status" },
          latency: { $first: "$latency" },
          lastChecked: { $first: "$createdAt" },
        },
      },
    ]);

    if (!latestTicks.length) {
      return res.status(200).json([]);
    }

    // Enrich with validator details (name, lat, lng, location)
    const validatorIds = latestTicks.map((t) => t._id);
    const validators = await Validator.find({ _id: { $in: validatorIds } }).select(
      "name location latitude longitude trustScore"
    );

    const validatorMap = {};
    validators.forEach((v) => {
      validatorMap[v._id.toString()] = v;
    });

    const result = latestTicks
      .filter((t) => validatorMap[t._id.toString()])
      .map((t) => {
        const v = validatorMap[t._id.toString()];
        return {
          validatorId: t._id,
          name: v.name,
          location: v.location,
          latitude: v.latitude,
          longitude: v.longitude,
          trustScore: v.trustScore,
          latestStatus: t.latestStatus, // "Good" or "Bad"
          latency: t.latency,
          lastChecked: t.lastChecked,
        };
      })
      // Only include validators with valid coordinates
      .filter((v) => v.latitude != null && v.longitude != null);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching validators for website:", error);
    res.status(500).json({ message: "Failed to fetch validators", error: error.message });
  }
});

// Fetch Validator Detail
app.get("/validator-detail", authenticateValidator, async (req, res) => {
  try {
    const user = req.user;
    const _id = user._id;
    const validatorDetails = await Validator.findById(_id).select("-password");
    const recentWebsites = await WebsiteTick.find({ validatorId: _id })
      .sort({ createdAt: -1 })
      .limit(5);
    const allValidatorsPendingPayout = await Validator.find().select(
      "pendingPayouts"
    );

    if (!validatorDetails) {
      return res.status(404).json({ message: "Validator not found" });
    }

    const blockchainLogs = await EventLog.find({
      actorId: _id,
      eventType: { $in: ['BLOCKCHAIN_VALIDATOR_HOURLY', 'BLOCKCHAIN_SYNC', 'PAYOUT_SUCCESS'] }
    }).sort({ timestamp: -1 }).limit(20);

    const averagePayout =
      allValidatorsPendingPayout.reduce(
        (acc, validator) => acc + (validator.pendingPayouts || 0),
        0
      ) / allValidatorsPendingPayout.length;

    res.status(200).json({
      validator: validatorDetails,
      recentWebsites: recentWebsites,
      averagePayout: averagePayout,
      totalValidator: allValidatorsPendingPayout.length,
      blockchainLogs: blockchainLogs,
    });
  } catch (err) {
    console.log("Error in getting user details");
    res.status(400).json({
      message: "Cannot get the Validator details",
    });
  }
});

app.post("/getPayout", authenticateValidator, async (req, res) => {
  console.log("Getting payout to user");
  try {
    const { _id } = req.user;

    await logEvent({
      category: 'PAYOUT',
      eventType: 'PAYOUT_INITIATED',
      actorId: _id.toString(),
      message: 'Validator requested a payout',
    });
    const validator = await Validator.findById(_id).select(
      "pendingPayouts payoutPublicKey isAdmitted"
    );
    if (!validator) {
      return res.status(404).json({ message: "Validator not found" });
    }

    const { pendingPayouts, payoutPublicKey, isAdmitted } = validator;
    if (!isAdmitted) {
      await logEvent({
        category: 'PAYOUT',
        eventType: 'PAYOUT_BLOCKED',
        severity: 'WARN',
        actorId: _id.toString(),
        message: 'Payout blocked: Validator is still in Trial Phase',
      });
      return res.status(403).json({
        message: "Payout blocked",
        reason: "You are currently in the Trial Phase. Please complete 500 successful checks and wait 24 hours to be fully admitted."
      });
    }

    if (!payoutPublicKey) {
      return res
        .status(400)
        .json({ message: "No payout public key found for the user" });
    }
    if (pendingPayouts < 800000) {
      await logEvent({
        category: 'PAYOUT',
        eventType: 'PAYOUT_FAILED',
        severity: 'WARN',
        actorId: _id.toString(),
        message: 'Payout failed: Insufficient rewards',
        metadata: { pendingPayouts }
      });
      return res.status(400).json({
        message: "Insufficient rewards",
        reason: "At least 800,000 lamports (~0.0008 SOL) are required for withdrawal to cover rent-exemption for new accounts."
      });
    }

    // Use the fallback public RPC specifically for payouts to avoid Alchemy's missing signatureSubscribe WS method
    const connection = new Connection(process.env.FALLBACK_RPC_URL || "https://api.devnet.solana.com", "confirmed");

    const memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    const memoText = `WatchTower Validator Payout: ${pendingPayouts} lamports | TS: ${Date.now()}`;

    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(ADMIN_PUBLIC_KEY),
        toPubkey: new PublicKey(payoutPublicKey),
        lamports: pendingPayouts,
      })
    ).add(
      new TransactionInstruction({
        keys: [{ pubkey: new PublicKey(ADMIN_PUBLIC_KEY), isSigner: true, isWritable: false }],
        programId: memoProgramId,
        data: Buffer.from(memoText, "utf-8"),
      })
    );
    let secretKeyBytes;
    try {
      // Try parsing as JSON array (common for Solana keypair files)
      const parsed = JSON.parse(ADMIN_PRIVATE_KEY);
      secretKeyBytes = Uint8Array.from(parsed);
    } catch (e) {
      // Fallback to base58 encoding
      secretKeyBytes = bs58.decode(ADMIN_PRIVATE_KEY);
    }
    const fromKeypair = Keypair.fromSecretKey(secretKeyBytes);
    const balance = await connection.getBalance(fromKeypair.publicKey);
    if (balance < 2000000) {
      await logEvent({
        category: 'PAYOUT',
        eventType: 'PAYOUT_FAILED',
        severity: 'ERROR',
        actorId: _id.toString(),
        message: 'Payout failed: Admin wallet low balance',
        metadata: { balance }
      });
      return res.status(400).json({ message: "Low balance" })
    }
    const signature = await sendAndConfirmTransaction(
      connection,
      transferTransaction,
      [fromKeypair]
    );
    await Validator.findByIdAndUpdate(_id, { pendingPayouts: 0 });

    await logEvent({
      category: 'PAYOUT',
      eventType: 'PAYOUT_SUCCESS',
      actorId: _id.toString(),
      message: `Payout successful: ${pendingPayouts} lamports`,
      metadata: { signature, amount: pendingPayouts }
    });

    return res.status(200).json({ message: "Payout successful", signature });
  } catch (err) {
    console.log("Error in Payout");
    console.log(err);
    await logEvent({
      category: 'PAYOUT',
      eventType: 'PAYOUT_FAILED',
      severity: 'ERROR',
      actorId: req.user ? req.user._id.toString() : 'UNKNOWN',
      message: 'Payout failed during transaction execution',
      metadata: { error: err.message }
    });
    return res.status(400).json({
      message: "Error in Payout",
      reason: "Atleast 0.0008 SOL is required"
    });
  }
});

// Website Tick Creation
app.post("/website-tick", async (req, res) => {
  try {
    const websiteTick = await WebsiteTick.create({
      websiteId: req.body.websiteId,
      validatorId: req.body.validatorId,
      status: req.body.status,
      latency: req.body.latency,
    });
    res.status(201).json(websiteTick);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Website Creation
// authenticatUser middleware -> add
app.post("/website", async (req, res) => {
  try {
    console.log("Reached creation of the server");
    // Normalize URL — ensure it always has a protocol
    const rawUrl = req.body.url || '';
    const normalizedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`;

    const website = await Website.create({
      url: normalizedUrl,
      userId: req.body.userId,
      websiteName: req.body.websiteName,
    });

    await logEvent({
      category: 'WEBSITE',
      eventType: 'WEBSITE_REGISTERED',
      actorId: req.body.userId,
      targetId: website._id.toString(),
      message: `Website registered: ${website.url}`,
    });

    res.status(201).json(website);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Website Tracking
app.put("/website-track/:id", async (req, res) => {
  console.log("Reached the update section");
  try {
    const disabled = await Website.findById({ _id: req.params.id }).select(
      "disabled"
    );
    const website = await Website.findByIdAndUpdate(
      req.params.id,
      {
        disabled: !disabled.disabled,
      },
      { new: true }
    );

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }
    res.json({ website, message: "Updated successfully" });
  } catch (err) {
    res
      .status(400)
      .json({ message: err.message, warning: "Update nhi ho raha bhai" });
  }
});

// Get Website details to Frontend
app.get("/website-details/:id", async (req, res) => {
  try {
    let websiteId = req.params.id;
    if (!websiteId || websiteId === 'undefined') {
      return res.status(400).json({ error: "Website ID is required" });
    }
    // Validate that the ID is a valid MongoDB ObjectId before querying
    if (!/^[a-f\d]{24}$/i.test(websiteId)) {
      return res.status(400).json({ error: "Invalid Website ID format" });
    }
    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }
    const allValidatorsPendingPayout = await Validator.find().select(
      "pendingPayouts"
    );
    const disabled = website.disabled;
    const dateCreated = website.createdAt;
    const downlog = await EventLog.find({
      targetId: websiteId,
      eventType: { $in: ['STATUS_CHANGED_DOWN', 'STATUS_CHANGED_UP'] }
    }).sort({ timestamp: -1 }).limit(10);
    const blockchainLogs = await EventLog.find({ targetId: websiteId, eventType: 'BLOCKCHAIN_LEDGER' }).sort({ timestamp: -1 }).limit(20);
    const hourlySummaries = await EventLog.find({ targetId: websiteId, eventType: 'BLOCKCHAIN_HOURLY_SUMMARY' }).sort({ timestamp: -1 }).limit(24);
    const websiteDetails = async () => {
      const ticks = await WebsiteTick.find({ websiteId });

      // If no ticks are found, return default values
      if (!ticks.length) {
        return {
          websiteName: website.websiteName,
          url: website.url,
          dateCreated: dateCreated || "0",
          uptimePercentage: 0, // Default uptime percentage
          response: 0, // Default response time
          averageLatencyPerMinute: [], // Empty array for latency data
          disabled,
          downlog: downlog || [],
          totalTicks: 0,
          goodTicks: 0,
          totalValidator: allValidatorsPendingPayout.length,
          blockchainLogs,
          hourlySummaries,
        };
      }

      // Group by 1-minute intervals
      const groupedTicks = {};
      ticks.forEach((tick) => {
        const minuteKey = new Date(tick.createdAt).setSeconds(0, 0); // Normalize to nearest minute

        if (!groupedTicks[minuteKey]) {
          groupedTicks[minuteKey] = [];
        }
        groupedTicks[minuteKey].push(tick.latency);
      });

      // Calculate average latency per minute interval
      const averageLatencyPerMinute = Object.entries(groupedTicks).map(
        ([timestamp, latencies]) => ({
          timestamp: new Date(parseInt(timestamp)), // Convert back to readable format
          averageLatency:
            latencies.reduce((sum, latency) => sum + latency, 0) /
            latencies.length,
        })
      );

      const totalTicks = ticks.length;
      const goodTicks = ticks.filter((tick) => tick.status === "Good").length;

      // Calculate uptime percentage
      const uptimePercentage =
        totalTicks > 0 ? (goodTicks / totalTicks) * 100 : 0;

      // Get the latest 1-minute latency average
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentTicks = ticks.filter(
        (tick) => new Date(tick.createdAt) > oneMinuteAgo
      );
      const avgLatency =
        recentTicks.length > 0
          ? recentTicks.reduce((sum, tick) => sum + tick.latency, 0) /
          recentTicks.length
          : 0;

      return {
        websiteName: website.websiteName,
        url: website.url,
        dateCreated: dateCreated || "0",
        uptimePercentage,
        response: avgLatency.toFixed(2), // Rounds to 2 decimal places
        averageLatencyPerMinute,
        disabled,
        downlog: downlog || [],
        totalTicks,
        goodTicks,
        totalValidator: allValidatorsPendingPayout.length,
        blockchainLogs,
        hourlySummaries,
      };
    };
    let websites = await websiteDetails();
    res.json(websites);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete Website
app.delete("/website/:id", async (req, res) => {
  try {
    const userId = req.header('userId'); // Get the user ID from Clerk
    const website = await Website.findOneAndDelete({
      _id: req.params.id,
      userId: userId,
    });

    if (!website) {
      return res.status(404).json({ message: "Website not found" });
    }

    // Also delete related website ticks
    await WebsiteTick.deleteMany({ websiteId: req.params.id });
    console.log("deleted website succesully");
    res.json({ message: "Website deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/dashboard-details", async (req, res) => {
  try {
    const userId = req.header('userId'); // Assuming authentication middleware sets `req.user`
    // Fetch all websites monitored by the user
    const websites = await Website.find({ userId });

    const disabledCount = websites.filter((site) => site.disabled).length;
    const enabledCount = websites.length - disabledCount;

    // Prepare response data
    const dashboardDetails = await Promise.all(
      websites.map(async (website) => {
        // Fetch all ticks for the website
        const ticks = await WebsiteTick.find({ websiteId: website._id });
        const disabled = website.disabled;
        const id = website._id;

        // If no ticks are found, return default values
        if (!ticks.length) {
          return {
            websiteName: website.websiteName,
            url: website.url,
            uptimePercentage: 0, // Default uptime percentage
            response: 0, // Default response time
            averageLatencyPerMinute: [], // Empty array for latency data
            disabled,
            id,
          };
        }

        // Group by 1-minute intervals
        const groupedTicks = {};
        ticks.forEach((tick) => {
          const minuteKey = new Date(tick.createdAt).setSeconds(0, 0); // Normalize to nearest minute

          if (!groupedTicks[minuteKey]) {
            groupedTicks[minuteKey] = [];
          }
          groupedTicks[minuteKey].push(tick.latency);
        });

        // Calculate average latency per minute interval
        const averageLatencyPerMinute = Object.entries(groupedTicks).map(
          ([timestamp, latencies]) => ({
            timestamp: new Date(parseInt(timestamp)), // Convert back to readable format
            averageLatency:
              latencies.reduce((sum, latency) => sum + latency, 0) /
              latencies.length,
          })
        );

        const totalTicks = ticks.length;
        const goodTicks = ticks.filter((tick) => tick.status === "Good").length;
        const badTicks = totalTicks - goodTicks;

        // Calculate uptime percentage
        const uptimePercentage =
          totalTicks > 0 ? (goodTicks / totalTicks) * 100 : 0;

        // Get the latest 1-minute latency average
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const recentTicks = ticks.filter(
          (tick) => new Date(tick.createdAt) > oneMinuteAgo
        );
        const avgLatency =
          recentTicks.length > 0
            ? recentTicks.reduce((sum, tick) => sum + tick.latency, 0) /
            recentTicks.length
            : 0;

        return {
          websiteName: website.websiteName,
          url: website.url,
          uptimePercentage,
          response: avgLatency.toFixed(2), // Rounds to 2 decimal places
          averageLatencyPerMinute,
          disabled,
          id,
        };
      })
    );

    res.json({
      websiteCount: websites.length,
      websites: dashboardDetails,
      disabledCount,
      enabledCount,
    });
  } catch (error) {
    console.error("Error fetching dashboard details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
