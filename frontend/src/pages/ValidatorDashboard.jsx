import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Server,
  Activity,
  Bell,
  Shield,
  Settings,
  LogOut,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import nacl from "tweetnacl";
import nacl_util from "tweetnacl-util";
import axios from "axios";
import { API_BASE_URL, HUB_WS_URL } from "../config";

/**
 * Skeleton shimmer placeholder — shown while data is loading.
 */
const Skeleton = ({ width = "w-24", height = "h-7" }) => (
  <span
    className={`inline-block ${width} ${height} bg-white/10 rounded-md animate-pulse`}
  />
);

/**
 * Flashes a green glow on the value whenever it changes (real-time update indicator).
 * Falls back to a plain span with no flash on initial render.
 */
const FlashValue = ({ value, className = "", suffix = "" }) => {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    // Don't flash on the very first render (value going from 0 → real data)
    if (prevRef.current !== value && prevRef.current !== null) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
    prevRef.current = value;
  }, [value]);

  return (
    <span
      className={`${className} inline-block transition-all duration-300 ${
        flash ? 'text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : ''
      }`}
    >
      {value}{suffix}
    </span>
  );
};

const ValidatorDashboard = () => {
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const [validatorId, setValidatorId] = useState(null);

  // Auth guard — redirect if no token (runs after mount, not during render)
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/signin-validator");
    }
  }, [navigate]);

  const [isSignedIn, setIsSignedIn] = useState(!!localStorage.getItem("token"));
  const [isLoaded, setIsLoaded] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [location, setLocation] = useState("");
  const [averagePayout, setAveragePayout] = useState("0");
  const [withdrawing, setWithDrawing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [trustScore, setTrustScore] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [successfulVerifications, setSuccessfulVerifications] = useState(0);
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [trialStartedAt, setTrialStartedAt] = useState(null);
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [activeChainTab, setActiveChainTab] = useState("all");

  const [mockRecentActivity, setMockRecentActivity] = useState([]);
  const [mockStats, setMockStats] = useState({
    totalValidator: 0,
    uptime: "—",
    rewards: "0",
    status: "Offline",
  });

  // Keep a ref so the WS onmessage can always read the latest validatorId
  // without needing to tear down and recreate the socket every time it's set.
  const validatorIdRef = useRef(null);
  useEffect(() => { validatorIdRef.current = validatorId; }, [validatorId]);

  // WebSocket for Real-time Updates — connect once, stays alive
  useEffect(() => {
    if (!HUB_WS_URL) return;

    let ws;
    let retryTimer;

    const connectWS = () => {
      ws = new WebSocket(HUB_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to Hub");
        ws.send(JSON.stringify({ type: "dashboard-connect" }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const myId = validatorIdRef.current; // always up-to-date

          if (message.type === 'validator-stats-update') {
            const { validatorId: updateId, trustScore: newTrust, pendingPayouts, totalChecks: newChecks, averagePayout: newAvgPayout } = message.data;
            // Accept the update if it matches our validator id
            if (!myId || updateId === myId) {
              if (newTrust !== undefined) setTrustScore(newTrust);
              if (newChecks !== undefined) setTotalChecks(newChecks);
              if (pendingPayouts !== undefined) {
                setMockStats(prev => ({ ...prev, rewards: pendingPayouts }));
              }
              if (newAvgPayout !== undefined) setAveragePayout(newAvgPayout);
            }
          }

          if (message.type === 'event-logged') {
            const { actorId, eventType, category, timestamp, metadata } = message.data;
            const isOurs = !myId || actorId === myId;

            // Handle blockchain logs
            if (isOurs && (eventType.startsWith('BLOCKCHAIN_') || eventType.includes('PAYOUT'))) {
              const newLog = {
                _id: Date.now().toString(),
                eventType,
                timestamp,
                metadata
              };
              setBlockchainLogs(prev => [newLog, ...prev.slice(0, 49)]);
            }

            // Handle recent validation activity
            if (isOurs && category === 'VALIDATOR') {
              const newActivity = {
                id: Date.now(),
                type: "Validation",
                status: metadata?.status === "Good" ? "Good" : "Bad",
                time: "just now",
                latency: metadata?.latency
              };
              setMockRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);
            }
          }

          // network-stats-update is for the owner dashboard (active node count)
          // — not relevant to the validator's personal stats, so we ignore it here.

        } catch (err) {
          console.error("[WS] Error parsing message:", err);
        }
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected. Retrying in 3s...");
        retryTimer = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error:", err.message);
        ws.close();
      };
    };

    connectWS();
    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []); // run once only — validatorIdRef keeps the id fresh

  // Start Validating
  useEffect(() => {
    const fetchValidatorDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/validator-detail`, {
          headers: {
            "Authorization": token,
            "Content-Type": "application/json",
          },
        });
        const { _id, name, location, payoutPublicKey, pendingPayouts, email,
          trustScore: ts, totalChecks: tc, successfulVerifications: sv,
          isAdmitted: admitted, trialStartedAt: trialStart } =
          res.data.validator;
        
        setValidatorId(_id);
        const totalValidator = res.data.totalValidator;
        const averagePayout = Number(res.data.averagePayout).toFixed(2);
        let recentWeb = res.data.recentWebsites;
        const transformedRecentWeb = recentWeb.map((activity) => {
          // Calculate time difference
          const now = new Date();
          const activityTime = new Date(activity.createdAt);
          const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));

          let timeAgo;
          if (diffInMinutes < 1) {
            timeAgo = "just now";
          } else if (diffInMinutes === 1) {
            timeAgo = "1 minute ago";
          } else if (diffInMinutes < 60) {
            timeAgo = `${diffInMinutes} minutes ago`;
          } else {
            const hours = Math.floor(diffInMinutes / 60);
            timeAgo = `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
          }

          return {
            id: activity._id,
            type: "Validation",
            status: activity.status === "Good" ? "Good" : "Bad",
            time: timeAgo,
            latency: activity.latency,
          };
        });

        setMockRecentActivity(transformedRecentWeb);
        setEmail(email);
        setUserName(name);
        setPublicKey(payoutPublicKey);
        setLocation(location);
        setMockStats((prev) => ({
          ...prev,
          rewards: pendingPayouts || "0",
          totalValidator: totalValidator || 0,
        }));
        setAveragePayout(averagePayout);
        setTrustScore(ts ?? 50);
        setTotalChecks(tc ?? 0);
        setSuccessfulVerifications(sv ?? 0);
        setIsAdmitted(admitted ?? false);
        setTrialStartedAt(trialStart);
        setBlockchainLogs(res.data.blockchainLogs || []);
      } catch (err) {
        console.log("Error fetching validator details:", err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem("token");
          navigate("/signin-validator");
        }
      } finally {
        setIsLoaded(true);
      }
    };
    fetchValidatorDetails();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    setIsSignedIn(false);
    navigate("/signin-validator");
  };

  const handleWithdraw = async () => {
    setWithDrawing(true);
    try {
      console.log("Withdraw function triggered");
      if (mockStats.rewards < 800000) {
        setAlertMessage("Minimum 800,000 Lamports should be there to claim");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000); // Hide alert after 5 seconds
        return;
      }
      const token = localStorage.getItem("token");
      console.log(token);
      const res = await axios.post("https://watchtower-backend-0zc7.onrender.com/getPayout", {}, {
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
      });
      if (res.status == 200) {
        setAlertMessage("Payment successful");
        setShowAlert(true);
        
        // Zero out rewards visually
        setMockStats(prev => ({...prev, rewards: 0}));
        
        // Inject the new on-chain log instantly
        if (res.data.signature) {
          const newLog = {
            _id: Date.now().toString(),
            eventType: 'PAYOUT_SUCCESS',
            timestamp: new Date().toISOString(),
            metadata: { signature: res.data.signature, amount: mockStats.rewards }
          };
          setBlockchainLogs(prev => [newLog, ...prev]);
        }
        
        setTimeout(() => setShowAlert(false), 5000); // Hide alert after 5 seconds
      }
      console.log(res);
    } catch (err) {
      console.log(err);
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        navigate("/signin-validator");
      } else {
        setAlertMessage(err.response?.data?.message || "Error processing withdrawal");
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000);
      }
    } finally {
      setWithDrawing(false);
    }
  };

  // No full-page spinner — we render the dashboard frame immediately
  // and show skeleton placeholders in each card until data arrives.


  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Enhanced Alert Popup */}
      {showAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-gray-900 to-black border border-purple-500/50 text-white px-8 py-4 rounded-xl shadow-2xl z-50 max-w-lg w-full backdrop-blur-lg"
        >
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${alertMessage.includes("Minimum") ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
              {alertMessage.includes("Minimum") ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${alertMessage.includes("Minimum") ? "text-yellow-400" : "text-green-400"}`}>
                {alertMessage.includes("Minimum") ? "Action Required" : "Success"}
              </h3>
              <p className="text-gray-300 mt-1">{alertMessage}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowAlert(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Dismiss
            </button>
          </div>

          <button
            onClick={() => setShowAlert(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* Auth Status Indicator */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Authentication successful! You're logged in as {email}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header with welcome message */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-white flex items-center"
            >
              Welcome, {userName}
              {isAdmitted && (
                <a href="https://explorer.solana.com" target="_blank" rel="noreferrer" title="Verified on Solana Blockchain">
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)] cursor-pointer">
                    <Shield className="w-3 h-3 mr-1" />
                    On-Chain Verified
                  </span>
                </a>
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-gray-400 mt-2"
            >
              Your validator node is online and actively contributing to the dPIN network.
            </motion.p>
          </div>
          
          {/* Trial Progress Box */}
          {!isAdmitted && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-4 md:mt-0 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex flex-col min-w-[250px]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-semibold text-sm">Trial Phase</span>
                <span className="text-gray-300 text-xs">{Math.min(totalChecks, 500)} / 500 checks</span>
              </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((totalChecks / 500) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Withdrawals unlocked after 500 checks and 24 hours.
              </p>
            </motion.div>
          )}
        </div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Validations</p>
                <h3 className="text-2xl font-bold mt-1">
                  {!isLoaded ? <Skeleton width="w-16" /> : <FlashValue value={totalChecks} className="text-white" />}
                </h3>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rewards Earned</p>
                <h3 className="text-2xl font-bold mt-1">
                  {!isLoaded ? <Skeleton width="w-32" /> : <FlashValue value={mockStats.rewards} suffix=" Lamports" className="text-white" />}
                </h3>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Shield className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Average Payout</p>
                <h3 className="text-2xl font-bold mt-1">
                  {!isLoaded ? <Skeleton width="w-32" /> : <FlashValue value={averagePayout} suffix=" Lamports" className="text-green-400" />}
                </h3>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Network className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Trust Score Card */}
          <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10 lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Star className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Trust Score</p>
                  <h3 className="text-2xl font-bold text-white mt-1">
                    {!isLoaded ? <Skeleton width="w-12" /> : <><FlashValue value={trustScore} className="text-white" /><span className="text-sm text-gray-400">/100</span></>}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Checks: {!isLoaded ? <Skeleton width="w-8" height="h-3" /> : <FlashValue value={totalChecks} className="text-gray-400" />}</p>
                <p className="text-xs text-gray-500">Verified: {!isLoaded ? <Skeleton width="w-8" height="h-3" /> : <FlashValue value={successfulVerifications} className="text-gray-400" />}</p>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  trustScore >= 70 ? 'bg-green-500' : trustScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${trustScore}%` }}
              ></div>
            </div>
            <p className={`text-xs mt-1 ${
              trustScore >= 70 ? 'text-green-400' : trustScore >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {trustScore >= 70 ? '★ High Trust — Eligible for verification tasks' : trustScore >= 40 ? '● Moderate Trust — Keep validating honestly' : '⚠ Low Trust — Your reports may be under review'}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Recent Activity
              </h2>

              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white/5 p-3 rounded-lg border border-white/5 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium text-white">
                          {activity.type}
                        </span>
                        <span
                          className={`ml-2 text-xs px-2 py-1 rounded-full ${activity.status === "Good"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500 text-white"
                            }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm mt-1">
                        {activity.latency && `Latency: ${activity.latency}`}
                      </div>
                    </div>
                    <div className="text-gray-500 text-sm">{activity.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-Chain Activity */}
            <div className="bg-black/30 backdrop-blur-md rounded-xl border border-purple-500/20 p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  On-Chain History
                </h2>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30">
                  Solana Devnet
                </span>
              </div>

              {/* Subtabs for On-Chain History */}
              <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                <button 
                  onClick={() => setActiveChainTab("all")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "all" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"}`}
                >
                  All Logs
                </button>
                <button 
                  onClick={() => setActiveChainTab("hourly")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "hourly" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"}`}
                >
                  Hourly Snapshots
                </button>
                <button 
                  onClick={() => setActiveChainTab("reputation")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "reputation" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"}`}
                >
                  Reputation Syncs
                </button>
                <button 
                  onClick={() => setActiveChainTab("payout")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "payout" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent"}`}
                >
                  Payouts
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {blockchainLogs && blockchainLogs.filter(log => {
                  if (activeChainTab === "all") return true;
                  if (activeChainTab === "hourly") return log.eventType === 'BLOCKCHAIN_VALIDATOR_HOURLY';
                  if (activeChainTab === "reputation") return log.eventType === 'BLOCKCHAIN_SYNC';
                  if (activeChainTab === "payout") return log.eventType === 'PAYOUT_SUCCESS';
                  return true;
                }).length > 0 ? (
                  blockchainLogs.filter(log => {
                    if (activeChainTab === "all") return true;
                    if (activeChainTab === "hourly") return log.eventType === 'BLOCKCHAIN_VALIDATOR_HOURLY';
                    if (activeChainTab === "reputation") return log.eventType === 'BLOCKCHAIN_SYNC';
                    if (activeChainTab === "payout") return log.eventType === 'PAYOUT_SUCCESS';
                    return true;
                  }).map((log) => (
                    <div
                      key={log._id}
                      className="bg-white/5 p-4 rounded-lg border border-white/5 flex flex-col md:flex-row justify-between md:items-center gap-3 hover:border-purple-500/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {log.eventType === 'BLOCKCHAIN_VALIDATOR_HOURLY' ? (
                            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-medium border border-blue-500/30">Hourly Snapshot</span>
                          ) : log.eventType === 'BLOCKCHAIN_SYNC' ? (
                            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded font-medium border border-amber-500/30">Reputation Sync</span>
                          ) : (
                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-medium border border-green-500/30">Payout Processed</span>
                          )}
                          <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {log.eventType === 'BLOCKCHAIN_VALIDATOR_HOURLY' ? (
                            <>Earned <strong className="text-yellow-400">{log.metadata?.earnedLamports} lamports</strong> for {log.metadata?.totalReports} validations.</>
                          ) : log.eventType === 'BLOCKCHAIN_SYNC' ? (
                            <>Trust Score mathematically verified on-chain.</>
                          ) : (
                            <>Successfully transferred <strong className="text-green-400">{log.metadata?.amount || "pending"} lamports</strong>.</>
                          )}
                        </p>
                      </div>
                      
                      {log.metadata?.signature ? (
                        <a 
                          href={`https://explorer.solana.com/tx/${log.metadata?.signature}?cluster=devnet`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/30 px-3 py-2 rounded-md border border-purple-500/30 transition-all whitespace-nowrap w-fit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                          Verify Tx
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500 italic bg-black/50 px-2 py-1 rounded">Simulated</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No on-chain history yet.</p>
                    <p className="text-gray-500 text-xs mt-1">Logs will appear here after your first hour of validation.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-6 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-white mb-4">
                Validator Control Panel
              </h2>

              {/* Removed the node settings, notifications, and security buttons */}

              <div className="mt-4 pt-4 border-t border-white/10 flex-grow">
                <div className="bg-white/5 rounded-lg p-4 h-full">
                  <div className="mb-3">
                    <div>
                      <div className="font-medium text-white">{userName}</div>
                      <div className="text-sm text-gray-400">{email}</div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-purple-400">Public Key:</span>
                        <span className="text-gray-300 break-all ml-1">{publicKey}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-purple-400">IP Address:</span>
                        <span className="text-gray-300 ml-1">{ipAddress}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-purple-400">Location:</span>
                        <span className="text-gray-300 ml-1">{location}</span>
                      </div>
                      <div className="text-sm mt-2">
                        <span className="font-medium text-purple-400">Trust Score:</span>
                        <span className={`ml-1 font-bold ${trustScore >= 70 ? 'text-green-400' : trustScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{trustScore}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <button
                      onClick={handleSignOut}
                      className="w-full mt-2 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={handleWithdraw}
                      className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-6 rounded-lg transition-colors text-lg font-medium w-full"
                      disabled={withdrawing}
                    >
                      {withdrawing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin mr-2 h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                          Withdrawing...
                        </div>
                      ) : (
                        "Withdraw Rewards"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CLI Quick Start Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-white">
              Validator CLI — Quick Start
            </h2>
            <a
              href="https://www.npmjs.com/package/aksh-validator-cli"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full transition-colors"
            >
              📦 npm package →
            </a>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            Run your validator node using the published CLI. Install it globally, register once, and keep it running to earn rewards.
          </p>

          <div className="space-y-5">
            {[
              {
                step: '1', label: 'Install the CLI',
                desc: 'Install the validator client globally via npm.',
                code: 'npm install -g aksh-validator-cli',
                note: 'Requires Node.js 16+',
              },
              {
                step: '2', label: 'Register Your Node',
                desc: 'Register with the WatchTower network. You\'ll be prompted for your name, email, password, and Solana payout wallet.',
                code: 'aksh-validator-cli register',
                note: 'Run this once. Your key pair is generated and submitted automatically.',
              },
              {
                step: '3', label: 'Start Validating',
                desc: 'Connect to the hub and begin monitoring websites.',
                code: 'aksh-validator-cli start',
                note: 'Keep this running. Longer honest uptime = higher trust score and rewards.',
              },
              {
                step: '4', label: 'Check Your Status',
                desc: 'View your validator info and current trust score anytime.',
                code: 'aksh-validator-cli info',
                note: 'Or track everything live right here on your dashboard.',
              },
            ].map(({ step, label, desc, code, note }) => (
              <div key={step} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-300 text-sm font-bold">{step}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium mb-1">{label}</p>
                  <p className="text-gray-400 text-sm mb-2">{desc}</p>
                  <div className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-green-300 flex items-center gap-2 overflow-x-auto">
                    <span className="text-gray-600 select-none">$</span>
                    <span className="flex-1">{code}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(code); }}
                      title="Copy command"
                      className="flex-shrink-0 ml-2 p-1 rounded text-gray-500 hover:text-green-300 hover:bg-white/10 transition-all duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                  {note && <p className="text-gray-500 text-xs mt-1.5 italic">{note}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ValidatorDashboard;
