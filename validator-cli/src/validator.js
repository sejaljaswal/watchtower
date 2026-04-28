const fs = require("fs");
const path = require("path");
const nacl = require("tweetnacl");
const naclUtil = require("tweetnacl-util");
const logger = require("../utils/logger");
const chalk = require('chalk');
const { connectWebsocket, getValidatorStatus } = require("./connection");

/**
 * Load private key from file
 * @param {string} filePath - Path to private key file
 * @returns {{ keypair: object, privateKeyBase64: string }} - Nacl keypair and base64 secret key
 */
const loadPrivateKeyFromFile = (filePath) => {
  try {
    // Resolve to absolute path if relative
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      logger.error(`Private key file not found: ${absolutePath}`);
      console.log(chalk.red(`
┌──────────────────────────────────────────────────┐
│  ERROR: PRIVATE KEY NOT FOUND                    │
│                                                  │
│  Create a keypair first with:                    │
│  ${chalk.white('validator-cli generate-keys')}                    │
└──────────────────────────────────────────────────┘
      `));
      process.exit(1);
    }

    const rawKey = fs.readFileSync(absolutePath, "utf-8").trim();
    let privateKeyBytes;
    let privateKeyBase64;
    let publicKeyBase64;

    try {
      // Try new JSON format first
      const parsed = JSON.parse(rawKey);
      if (parsed.privateKey && parsed.publicKey) {
        privateKeyBase64 = parsed.privateKey;
        publicKeyBase64 = parsed.publicKey;
        privateKeyBytes = naclUtil.decodeBase64(privateKeyBase64);
      } else if (Array.isArray(parsed)) {
        // Legacy JSON array format
        privateKeyBytes = Uint8Array.from(parsed);
        if (privateKeyBytes.length !== nacl.sign.secretKeyLength) {
          throw new Error("Invalid JSON secret key length");
        }
        privateKeyBase64 = naclUtil.encodeBase64(privateKeyBytes);
      } else {
        throw new Error("Invalid key file format");
      }
    } catch (jsonError) {
      // Try legacy base64 format
      try {
        privateKeyBytes = naclUtil.decodeBase64(rawKey);
        if (privateKeyBytes.length !== nacl.sign.secretKeyLength) {
          throw new Error("Invalid base64 secret key length");
        }
        privateKeyBase64 = rawKey;
      } catch (base64Error) {
        throw jsonError;
      }
    }

    const keypair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
    if (!publicKeyBase64) {
      publicKeyBase64 = naclUtil.encodeBase64(keypair.publicKey);
    }

    logger.success("Private key loaded successfully");
    return { keypair, privateKeyBase64, publicKeyBase64 };
  } catch (error) {
    logger.error(`Failed to load private key: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Load config file
 * @returns {object} - Config object
 */
const loadConfig = () => {
  const configPath = process.env.CONFIG_PATH ||
    path.resolve(__dirname, "../config/config.json");

  if (!fs.existsSync(configPath)) {
    // Create a default config if one doesn't exist
    const defaultConfig = {
      hubServer: "wss://hackindia-spark-7-north-region-aksh.onrender.com",
      pingInterval: 10000
    };

    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      logger.success(`Created default config at: ${configPath}`);
    } catch (error) {
      logger.error(`Failed to create default config: ${error.message}`);
      process.exit(1);
    }
  }

  try {
    const config = require(configPath);
    return config;
  } catch (error) {
    logger.error(`Failed to load config: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Start the validator
 * @param {string} privateKeyPath - Path to private key file
 * @param {object} spinner - Ora spinner for UI feedback
 * @returns {Promise<void>}
 */
const startValidator = async (privateKeyPath, spinner) => {
  // Display startup header
  console.log(chalk.magenta('\n ┌─────────────────────────────────────┐'));
  console.log(chalk.magenta(' │        STARTING VALIDATOR NODE        │'));
  console.log(chalk.magenta(' └─────────────────────────────────────┘\n'));

  // Load private key from the provided path
  const { privateKeyBase64 } = loadPrivateKeyFromFile(privateKeyPath);
  const config = loadConfig();

  // Log the hub server we're connecting to
  logger.log(`Hub server: ${chalk.magenta.bold(config.hubServer)}`);
  logger.log(`Key path: ${chalk.yellow(privateKeyPath)}`);

  if (spinner) {
    spinner.text = 'Initializing validator...';
    spinner.color = 'magenta';
  }

  // Connect to websocket using our new module
  await connectWebsocket(privateKeyBase64, config.hubServer, spinner);

  // Display active indicator
  setInterval(() => {
    const status = getValidatorStatus();
    if (status.connected) {
      const time = new Date().toLocaleTimeString();
      process.stdout.write(`\r${chalk.gray(time)} ${chalk.green('●')} Validator active | Latest ping: ${status.lastPingTime ? new Date(status.lastPingTime).toLocaleTimeString() : 'N/A'}`);
    }
  }, 10000);
};

module.exports = {
  startValidator,
  getValidatorStatus,
  loadPrivateKeyFromFile
};