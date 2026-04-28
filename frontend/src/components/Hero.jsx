import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Shield, Activity, ArrowRight } from 'lucide-react';
import Globe3DDemo from './Globe3DDemo';

export default function Hero() {
  const [gridItems, setGridItems] = useState(0);

  useEffect(() => {
    const calculateGrid = () => {
      const vh = Math.ceil(window.innerHeight / 40);
      const vw = Math.ceil(window.innerWidth / 40);
      setGridItems(vh * vw);
    };

    calculateGrid();
    window.addEventListener('resize', calculateGrid);
    return () => window.removeEventListener('resize', calculateGrid);
  }, []);

  const FeatureBadge = ({ icon: Icon, text }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.2 }}
      className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"
    >
      <Icon size={16} className="text-purple-400" />
      <span className="text-sm text-white">{text}</span>
    </motion.div>
  );

  return (
    <div className="relative min-h-screen bg-[#0A0F1F] text-white overflow-hidden flex items-center pt-8 md:pt-27">
      {/* Grid Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] auto-rows-[40px] opacity-20">
          {Array.from({ length: gridItems }).map((_, i) => (
            <div
              key={i}
              className="border-[0.5px] border-gray-500/20"
              style={{ aspectRatio: '1/1' }}
            />
          ))}
        </div>
      </div>
      
      {/* Subtle background glow/overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1F] via-[#0A0F1F]/90 to-transparent z-10" />

      {/* Content Container */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-16 py-20 flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* LEFT: existing content */}
        <div className="max-w-xl flex flex-col items-start text-left">
          {/* Spotlight badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-purple-500/30 mb-8"
          >
            <span className="text-sm text-white/90 font-medium">
              <span className="text-purple-400 font-semibold">New:</span> Blockchain-Powered Monitoring Beta
            </span>
          </motion.div>
          
          {/* Main headline */}
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight"
          >
            <span className="relative inline-block">
              <span className="absolute -inset-1 blur-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg"></span>
              <span className="relative">Next-Gen</span>
            </span>{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 text-transparent bg-clip-text">
              Decentralized
            </span>
            <br />
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-gradient-to-r from-purple-300 to-white text-transparent bg-clip-text"
            >
              Website Monitoring
            </motion.span>
          </motion.h1>
          
          {/* Tagline */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg"
          >
            Ensure uptime, performance, and security with a trustless, 
            blockchain-powered monitoring network that can't be compromised.
          </motion.p>
          
          {/* Feature badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="flex flex-wrap gap-3 mb-10"
          >
            <FeatureBadge icon={Globe} text="Decentralized" />
            <FeatureBadge icon={Shield} text="Tamper-Proof" />
            <FeatureBadge icon={Activity} text="Real-Time" />
          </motion.div>
          
          {/* CTA button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 1.3 }}
  className="flex items-center mb-16 -mt-6"
          >
            <div className="button-glow-wrapper group">
              <Link to="/sign-up">
                <button className="relative px-8 py-4 bg-black border-2 border-transparent rounded-full font-semibold text-white transition-all duration-300 group-hover:scale-[0.98] overflow-hidden animate-button-shine">
                  <span className="flex items-center gap-2">
                    Start Monitoring <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Stats counters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12"
          >
            {[
              { value: "99.99%", label: "Uptime" },
              { value: "1,240+", label: "Nodes" },
              { value: "45s", label: "Alerts" }
            ].map((stat, i) => (
              <div key={i} className="text-left">
                <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT: globe */}
        <div className="relative w-full md:w-1/2 flex items-center justify-center md:-mt-16">
          {/* Soft glow behind globe - set to pointer-events-none */}
          <div className="absolute w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-cyan-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
          <div className="absolute w-[200px] h-[200px] md:w-[350px] md:h-[350px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
          
          {/* Blur effect behind globe - set to pointer-events-none */}
          <div className="absolute inset-0 backdrop-blur-[2px] z-0 pointer-events-none" />
          
          {/* Globe Container with strict size limits */}
          <div className="relative z-10 w-full h-[400px] md:h-[700px] max-w-[700px] max-h-[700px] min-w-[300px] min-h-[300px] flex items-center justify-center opacity-90 pointer-events-auto">
            <Globe3DDemo />
          </div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white/40 rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%", 
              opacity: Math.random() * 0.5 + 0.1 
            }}
            animate={{ 
              y: [null, Math.random() * 100 + "%", Math.random() * 100 + "%"],
              x: [null, Math.random() * 100 + "%", Math.random() * 100 + "%"],
              opacity: [null, Math.random() * 0.5 + 0.1, Math.random() * 0.5 + 0.1]
            }}
            transition={{ 
              duration: 20 + Math.random() * 30, 
              repeat: Infinity, 
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
}
