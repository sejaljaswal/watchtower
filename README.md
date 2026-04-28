# 🌐 dPIN Website Monitoring System 

A **decentralized website monitoring system** leveraging **dPIN (Decentralized Public Infrastructure Network)** to ensure **trustless uptime verification, real-time alerts, and transparency** without relying on centralized authorities.  

> With dPIN, experience a truly decentralized, transparent, and reliable website monitoring system.

## 🔥 Key Features  
🔹 **No Single Point of Failure** – Distributed monitoring across independent validators.  

🔹 **Trustless Transparency** – Website owners can prove uptime without a central entity.  

🔹 **Crypto Incentives** – Validators earn rewards for monitoring and reporting website health.  

🔹 **Decentralized Monitoring** – Multiple nodes check website status instead of a single company.  

🔹 **Real-Time Alerts** – Instant notifications for downtime or performance issues.

🔹 **Emergency Mobile Buzzer** – High-priority mobile sirens via Pushover that bypass silent mode for critical downtime.

🔹 **Security & Privacy** – No third-party access to website data.  

---

## 🛑 Problem Statement  
Traditional website monitoring systems are **centralized, opaque, and vulnerable** to **downtime, censorship, and manipulation**. They rely on single providers, limiting transparency and control.  

---

## ✅ Solution  

Our **dPIN-based monitoring system** decentralizes website uptime tracking by leveraging independent validators across a global network. Unlike traditional systems, which rely on a single authority, our solution ensures **real-time, trustless, and tamper-proof monitoring** without any central points of failure. Website owners can **prove uptime transparently**, while users receive **instant alerts** for downtime or performance issues. Validators are incentivized with **crypto rewards**, fostering a **self-sustaining, censorship-resistant** ecosystem that enhances reliability, security, and trust in website monitoring.

---

## 🛠️ Tech Stack  
🛡️ **Blockchain** – Solana 

🌍 **dPIN (Decentralized Public Infrastructure Network)** – Distributed monitoring  

🔗 **Database** – MongoDB   

🖥️ **Frontend** – React.js, Radix UI, Tailwind CSS, ShadCN  

📡 **Backend** – Node.js, Express.js

🔒 **Authentication** – Clerk

⚙️ **Validator CLI** – Commander.js, Chalk

---

## ⚙️ Installation & Setup  
```bash
# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your specific configuration

# 1. Run the Main Backend
node index.js

# 2. Run the Hub (WebSocket) Server (Required for Validators)
cd hub
node server.js

# 3. Run the Notary Service (Required for Attestations)
cd ../notary
node server.js

# 4. Install & Run the Frontend
cd ../../frontend
npm install
cp .env.example .env
npm run dev
```

## 🔑 Getting API Keys

Before you can run the application, you'll need to obtain several API keys and credentials:

### 1. JWT Secret
- This is used for authentication in the backend
- Generate a secure random string

### 2. Solana Wallet Keys (Admin)
- Generate a Solana keypair for the admin account:
  ```bash
  solana-keygen new
  ```

### 3. Solana RPC URL
- Sign up for a free account at Alchemy or Helius.

### 4. Clerk Authentication
- Create an account at Clerk and get your Publishable and Secret keys.

### 5. Email Service (Nodemailer)
- Use a Gmail App Password for `PASS_NODEMAILER`.

### 6. Pushover (Optional for Mobile Buzzer)
- Create an account at Pushover and get an Application Token for `PUSHOVER_APP_TOKEN`.

---

## 🧠 Project Structure
```
dPIN/
├── backend/               # Express.js API & WebSocket server
│   ├── blockchain/        # Solana blockchain interaction modules
│   ├── db/                # Database connection configuration
│   ├── hub/               # WebSocket server for real-time consensus
│   ├── model/             # MongoDB schemas
│   ├── notary/            # Blockchain notary and payout logic
│   ├── utils/             # Helper functions
│   └── index.js           # Main Express server file
├── frontend/              # React.js application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Library configurations
│       ├── pages/         # Application views/pages
│       ├── utils/         # Helper utilities
│       └── App.jsx        # Main application component
├── linux-cli/             # Headless validator CLI tool for Linux servers
├── validator-cli/         # Node.js CLI tool for validators
├── tests/                 # Testing suites and scripts
└── blockchain/            # Smart contracts and anchor programs
```

---

## 🚀 Running a Validator node

To contribute to the network and earn SOL rewards, you can run a validator node:

### Node.js CLI (Interactive)
```bash
cd validator-cli
npm install
node src/cli.js
```

### Headless Linux CLI (Service-ready)
```bash
cd linux-cli
npm install
./run.sh
```

---

## 🧪 Testing & Simulation

You can simulate a large network of validators and website downtime without physical hardware:

### MeshNet Simulator
This script spawns 10+ virtual validators to test consensus and the dashboard map.
```bash
cd tests
npm install
node meshnet-simulator.js
```

---

## 📝 API Endpoints

### User Endpoints
- `POST /user` - Create a new user
- `PUT /user/pushover` - Update user's Pushover API key for mobile "Buzzer" alerts
- `GET /dashboard-details` - Get user dashboard information

### Website Monitoring Endpoints
- `POST /website` - Register a new website for monitoring
- `GET /website-details/:id` - Get detailed metrics and logs
- `DELETE /website/:id` - Remove a website from monitoring
- `PUT /website-track/:id` - Enable/disable monitoring
- `GET /website/:id/validators` - Get active validators for a website

### Validator Endpoints
- `POST /validator` - Register a new validator
- `POST /validator-signin` - Authenticate validator
- `GET /validator-detail` - Get validator stats and rewards
- `POST /getPayout` - Request reward withdrawal

---

## 🙌 Team Members
- **Rohan Kumar Mohanta**
- **Jayesh Krishna**
- **Shivangi Sharma**

---

## 📜 If you found this useful, don't forget to ⭐ star this repo!
