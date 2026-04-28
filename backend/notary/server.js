import { configDotenv } from 'dotenv';
configDotenv({ path: '../.env' });
import express from 'express';
import http from 'http';
import https from 'https';
import net from 'net';
import mongoose from 'mongoose';
import { loadOrCreateKeypair, createAttestation, verifyAttestation } from './attestation.js';
import { logEvent } from '../utils/logger.js';

const app = express();
app.use(express.json());

const NOTARY_PORT = process.env.NOTARY_PORT || 8082;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/watchtower';

// Connect to Database
mongoose.connect(MONGO_URI)
  .then(() => console.log('[NOTARY] Connected to MongoDB'))
  .catch(err => console.error('[NOTARY] MongoDB connection error:', err));

const keypair = loadOrCreateKeypair();

console.log('[NOTARY] Service starting...');
console.log(`[NOTARY] Public Key: ${Buffer.from(keypair.publicKey).toString('base64')}`);

/**
 * Measure TCP connection latency to a host.
 */
function getTcpLatency(hostname, port) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve(latency);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });

    socket.connect(port, hostname);
  });
}

/**
 * Get the HTTP status code of a URL using a HEAD request.
 */
function getStatusCode(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const startTime = Date.now();

      const options = {
        method: 'HEAD',
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Connection': 'close',
          'User-Agent': 'WatchTower-Notary/1.0',
        },
      };

      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(options, (res) => {
        const time = Date.now() - startTime;
        res.resume();

        // Follow redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          const redirectUrl = new URL(res.headers.location, url);
          return resolve(getStatusCode(redirectUrl.toString()));
        }

        resolve({ statusCode: res.statusCode, time });
      });

      req.on('error', () => {
        resolve({ statusCode: 0, time: Date.now() - startTime });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ statusCode: 0, time: 5000 });
      });

      req.end();
    } catch (err) {
      resolve({ statusCode: 0, time: 0 });
    }
  });
}

// ───────────── API ENDPOINTS ─────────────

/**
 * POST /notarize
 * Body: { url: string }
 * 
 * The Notary independently checks the URL and returns a signed attestation.
 */
app.post('/notarize', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[NOTARY] Notarizing: ${url}`);
  const startTime = Date.now();

  await logEvent({
    category: 'SYSTEM',
    eventType: 'NOTARIZATION_STARTED',
    severity: 'DEBUG',
    message: `Notary starting independent check for: ${url}`,
  });

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const port = urlObj.protocol === 'https:' ? 443 : 80;

    // Measure TCP latency
    const tcpLatency = await getTcpLatency(hostname, port);

    // Get HTTP status
    const statusResult = await getStatusCode(url);

    const attestationData = {
      url,
      statusCode: statusResult.statusCode,
      latency: tcpLatency || statusResult.time,
      timestamp: startTime,
    };

    // Sign the attestation
    const signedAttestation = createAttestation(keypair, attestationData);

    console.log(`[NOTARY] ✅ Attestation created: status=${statusResult.statusCode}, latency=${attestationData.latency}ms`);

    await logEvent({
      category: 'SYSTEM',
      eventType: 'NOTARIZATION_SUCCESS',
      severity: 'DEBUG',
      message: `Notary completed check for ${url}`,
      metadata: { statusCode: statusResult.statusCode, latency: attestationData.latency }
    });

    return res.status(200).json(signedAttestation);
  } catch (err) {
    console.error(`[NOTARY] ❌ Error notarizing ${url}:`, err.message);
    
    await logEvent({
      category: 'SYSTEM',
      eventType: 'NOTARIZATION_FAILED',
      severity: 'ERROR',
      message: `Notary failed to check ${url}`,
      metadata: { error: err.message }
    });

    return res.status(500).json({ error: 'Notarization failed', reason: err.message });
  }
});

/**
 * POST /verify
 * Body: { attestation, signature, publicKey }
 * 
 * Verifies that a given attestation is genuinely signed.
 */
app.post('/verify', (req, res) => {
  const { attestation, signature, publicKey } = req.body;

  if (!attestation || !signature || !publicKey) {
    return res.status(400).json({ error: 'attestation, signature, and publicKey are required' });
  }

  const isValid = verifyAttestation({ attestation, signature, publicKey });

  return res.status(200).json({
    valid: isValid,
    attestation: isValid ? attestation : null,
  });
});

/**
 * GET /health
 * Returns the service status and public key.
 */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'WatchTower Notary Service',
    publicKey: Buffer.from(keypair.publicKey).toString('base64'),
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "WatchTower Notary is working", status: "ok" });
});

// ───────────── START SERVER ─────────────

app.listen(NOTARY_PORT, () => {
  console.log(`[NOTARY] ✅ Notary Service running on port ${NOTARY_PORT}`);
  console.log(`[NOTARY] Endpoints:`);
  console.log(`  POST /notarize  — Independently check a URL and return a signed attestation`);
  console.log(`  POST /verify    — Verify an attestation signature`);
  console.log(`  GET  /health    — Service health check`);
});
