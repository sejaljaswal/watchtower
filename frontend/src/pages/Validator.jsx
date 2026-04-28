import React, { useState, useEffect } from 'react';
import { Network, Shield, Cpu, Globe, Terminal, MousePointer, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Validator = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('ui');
  const [copiedStep, setCopiedStep] = useState(null);

  const handleCopy = (code, step) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };
  
  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-16 relative">
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px]"></div>
          
          {/* Hero Content */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 text-center">
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-[linear-gradient(to_left,#4d4d4d,#848484_20%,#ffffff_50%,#848484_80%,#4d4d4d_100%)] bg-clip-text text-transparent blur-[2px] brightness-150"></span>
              <span className="relative bg-[linear-gradient(to_left,#6b6b6b,#848484_20%,#ffffff_50%,#848484_80%,#6b6b6b_100%)] bg-clip-text text-transparent animate-shine-fast">
                Become a dPIN Validator
              </span>
            </span>
          </h1>
          
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-10 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-2/5 bg-gradient-to-l from-purple-600/10 to-transparent"></div>
            
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">What is dPIN?</h2>
            
            <p className="text-gray-300 mb-6 max-w-3xl">
              <span className="text-purple-400 font-semibold">dPIN</span> (Decentralized Physical Infrastructure Network) is a revolutionary approach to website monitoring that leverages blockchain technology to create a trustless, distributed network of validators.
            </p>
            
            <p className="text-gray-300 mb-8 max-w-3xl">
              Unlike traditional monitoring services that rely on centralized servers, dPIN distributes monitoring responsibilities across a global network of independent validators, ensuring unparalleled reliability, transparency, and resistance to manipulation.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <Network className="w-8 h-8 text-purple-400 mb-2" />
                <h3 className="text-lg font-medium text-white mb-1">Decentralized</h3>
                <p className="text-gray-400 text-sm">No central points of failure or control</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <Shield className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="text-lg font-medium text-white mb-1">Tamper-Proof</h3>
                <p className="text-gray-400 text-sm">Immutable records secured by blockchain</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <Cpu className="w-8 h-8 text-green-400 mb-2" />
                <h3 className="text-lg font-medium text-white mb-1">Transparent</h3>
                <p className="text-gray-400 text-sm">Open verification of all monitoring results</p>
              </div>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                <Globe className="w-8 h-8 text-pink-400 mb-2" />
                <h3 className="text-lg font-medium text-white mb-1">Global</h3>
                <p className="text-gray-400 text-sm">Monitoring nodes spread across the world</p>
              </div>
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
          <span className="relative inline-block">
            <span className="absolute inset-0 bg-[linear-gradient(to_left,#4d4d4d,#848484_20%,#ffffff_50%,#848484_80%,#4d4d4d_100%)] bg-clip-text text-transparent blur-[2px] brightness-150"></span>
            <span className="relative bg-[linear-gradient(to_left,#6b6b6b,#848484_20%,#ffffff_50%,#848484_80%,#6b6b6b_100%)] bg-clip-text text-transparent animate-shine-fast">
              Join Our Validator Network
            </span>
          </span>
        </h2>
        
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 md:p-8 mb-10 border border-white/10">
          <p className="text-gray-300 mb-6">
            Help secure our network and earn rewards by becoming a validator. Validators play a crucial role in our ecosystem by validating transactions and maintaining the integrity of the blockchain.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-black/30 p-5 rounded-xl border border-white/5">
              <h3 className="text-xl font-medium text-white mb-3">Requirements</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Reliable internet connection</li>
                <li>• Moderate computer specifications</li>
                <li>• Basic understanding of blockchain</li>
                <li>• Willingness to participate in the network</li>
              </ul>
            </div>
            
            <div className="bg-black/30 p-5 rounded-xl border border-white/5">
              <h3 className="text-xl font-medium text-white mb-3">Benefits</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Earn rewards for network participation</li>
                <li>• Participate in governance decisions</li>
                <li>• Access to exclusive validator community</li>
                <li>• Priority technical support</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup-validator">
                <button className="bg-[#3868F9] hover:bg-indigo-600 text-white font-medium py-3 px-8 rounded-full transition duration-300">
                  Apply to Become a Validator
                </button>
              </Link>
              <Link to="/signin-validator">
                <button className="border border-white/20 hover:border-purple-400/60 hover:bg-purple-500/10 text-gray-300 hover:text-white font-medium py-3 px-8 rounded-full transition duration-300">
                  Already a Validator? Sign In
                </button>
              </Link>
            </div>

            {/* How to Get Started — Tabbed */}
            <div className="mt-10 bg-black/30 rounded-2xl border border-white/10 overflow-hidden">
              {/* Tab Header */}
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('ui')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === 'ui'
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/3'
                  }`}
                >
                  <MousePointer className="w-4 h-4" />
                  Via UI
                  {activeTab === 'ui' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('cli')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                    activeTab === 'cli'
                      ? 'text-white bg-white/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/3'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  Via CLI
                  {activeTab === 'cli' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'ui' && (
                  <ol className="space-y-5">
                    {[
                      {
                        step: '1', color: 'purple',
                        title: 'Create an Account',
                        desc: 'Click "Apply to Become a Validator" above and fill in your name, email, and password.',
                      },
                      {
                        step: '2', color: 'purple',
                        title: 'Generate Your Key Pair',
                        desc: 'On the sign-up page, click "Generate Key Pair". A public/private key pair will be created in your browser. Save the private key safely — you\'ll need it to run the CLI.',
                      },
                      {
                        step: '3', color: 'purple',
                        title: 'Enter Your Solana Payout Wallet',
                        desc: 'Paste your Solana wallet public key in the "Public Key (for payout)" field. This is where your rewards will be sent.',
                      },
                      {
                        step: '4', color: 'purple',
                        title: 'Submit & Download Private Key',
                        desc: 'Submit the form. Your private key file will be downloaded automatically. Keep it safe — it\'s required to start the CLI validator node.',
                      },
                      {
                        step: '5', color: 'purple',
                        title: 'Sign In & Monitor Your Stats',
                        desc: 'Sign in to your Validator Dashboard to track your trust score, payout balance, and real-time validation activity.',
                      },
                    ].map(({ step, title, desc }) => (
                      <li key={step} className="flex gap-4 items-start">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-sm font-bold">{step}</span>
                        <div>
                          <p className="text-white font-medium">{title}</p>
                          <p className="text-gray-400 text-sm mt-0.5">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {activeTab === 'cli' && (
                  <div className="space-y-6">
                    <p className="text-gray-400 text-sm">
                      The CLI is the recommended path for running a persistent validator node. It handles registration, key management, and validation automatically.
                    </p>

                    {[
                      {
                        step: '1', label: 'Install the CLI',
                        desc: 'Install the validator client globally via npm:',
                        code: 'npm install -g aksh-validator-cli',
                        note: 'Requires Node.js 16+',
                      },
                      {
                        step: '2', label: 'Register Your Node',
                        desc: 'Register your validator with the WatchTower network. You\'ll be prompted for your name, email, password, and Solana payout wallet.',
                        code: 'aksh-validator-cli register',
                        note: 'Run this once. Your public key is submitted to the network automatically.',
                      },
                      {
                        step: '3', label: 'Start Validating',
                        desc: 'Start the validator node. It connects to the hub and begins monitoring websites.',
                        code: 'aksh-validator-cli start',
                        note: 'Keep this process running. The longer you validate honestly, the higher your trust score and rewards.',
                      },
                      {
                        step: '4', label: 'Check Your Status',
                        desc: 'View your validator info and current trust score at any time:',
                        code: 'aksh-validator-cli info',
                        note: 'Or track everything live on your Validator Dashboard.',
                      },
                    ].map(({ step, label, desc, code, note }) => (
                      <div key={step} className="flex gap-4 items-start">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-300 text-sm font-bold">{step}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium mb-1">{label}</p>
                          <p className="text-gray-400 text-sm mb-2">{desc}</p>
                          <div className="bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 font-mono text-sm text-green-300 flex items-center gap-2 overflow-x-auto group">
                            <span className="text-gray-600 select-none">$</span>
                            <span className="flex-1">{code}</span>
                            <button
                              onClick={() => handleCopy(code, step)}
                              title="Copy command"
                              className={`flex-shrink-0 ml-2 p-1 rounded transition-all duration-200 ${
                                copiedStep === step
                                  ? 'text-green-400 bg-green-500/20'
                                  : 'text-gray-500 hover:text-green-300 hover:bg-white/10'
                              }`}
                            >
                              {copiedStep === step
                                ? <Check className="w-3.5 h-3.5" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {note && <p className="text-gray-500 text-xs mt-1.5 italic">{note}</p>}
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl flex items-start gap-3">
                      <Terminal className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-green-300 text-sm font-medium">Package published on npm</p>
                        <a
                          href="https://www.npmjs.com/package/aksh-validator-cli"
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-400 hover:text-green-300 text-xs underline underline-offset-2 transition-colors"
                        >
                          npmjs.com/package/aksh-validator-cli →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Validator;
