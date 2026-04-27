import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Shield, Server, Lock, Database, Network, Globe, Eye } from 'lucide-react';

const comparisonData = {
  traditional: {
    title: "Web2 Monitoring Solutions",
    metrics: [
      {
        icon: Server,
        title: "Infrastructure",
        value: "Centralized",
        description: "Single point of failure, vulnerable to outages"
      },
      {
        icon: Lock,
        title: "Data Reliability",
        value: "Moderate",
        description: "Data can be manipulated or tampered with"
      },
      {
        icon: Database,
        title: "Transparency",
        value: "Limited",
        description: "Black-box monitoring with proprietary methods"
      },
      {
        icon: Clock,
        title: "Resilience",
        value: "Medium",
        description: "Dependent on provider's uptime and reliability"
      }
    ]
  },
  ai: {
    title: "Web3 Decentralized Monitoring",
    metrics: [
      {
        icon: Network,
        title: "Infrastructure",
        value: "Decentralized",
        description: "Fault-tolerant network with no single point of failure"
      },
      {
        icon: Shield,
        title: "Data Reliability",
        value: "High",
        description: "Immutable blockchain-backed monitoring records"
      },
      {
        icon: Globe,
        title: "Transparency",
        value: "Complete",
        description: "Open verification of all monitoring activities"
      },
      {
        icon: Eye,
        title: "Resilience",
        value: "Very High",
        description: "Continues even if multiple nodes go offline"
      }
    ]
  }
};

const fadeInUpVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const Comparison = () => {
  return (
    <div id="comparison" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Web2 vs Web3 Monitoring
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            See how our decentralized blockchain-powered monitoring platform compares to traditional centralized solutions.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {[comparisonData.traditional, comparisonData.ai].map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              variants={fadeInUpVariant}
              transition={{ duration: 0.4 }}
              className={`p-6 md:p-8 rounded-3xl border shadow-xl flex flex-col h-full transition-colors ${
                sectionIndex === 0 
                  ? 'bg-gray-900/80 border-gray-700/50' 
                  : 'bg-indigo-900/10 border-indigo-500/30 relative overflow-hidden'
              }`}
            >
              {sectionIndex === 1 && (
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
              )}
              <h3 className="text-2xl font-bold tracking-tight text-white text-center mb-8 relative z-10">{section.title}</h3>
              <div 
                className="flex flex-col gap-4 relative z-10 flex-1"
              >
                {section.metrics.map((metric, index) => (
                  <div
                    key={metric.title}
                    className={`p-5 rounded-2xl border transition-all duration-300 group hover:-translate-y-0.5 ${
                      sectionIndex === 0 
                        ? 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600' 
                        : 'bg-indigo-950/40 border-indigo-500/20 hover:bg-indigo-900/40 hover:border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-2.5 rounded-xl border ${
                        sectionIndex === 0 
                          ? 'bg-gray-800 border-gray-700 text-gray-400' 
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      }`}>
                        <metric.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5">
                          <h4 className="text-base font-semibold text-white tracking-tight">{metric.title}</h4>
                          <span className={`text-sm font-bold tracking-wide mt-1 sm:mt-0 ${
                            sectionIndex === 0 ? 'text-gray-400' : 'text-emerald-400'
                          }`}>
                            {metric.value}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{metric.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-gray-400 mb-8">
            Experience the future of website monitoring with our decentralized blockchain-powered platform.
          </p>
          <Link to="/pricing">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white text-gray-900 px-8 py-3.5 rounded-xl font-bold tracking-tight hover:bg-gray-100 transition-colors duration-200 shadow-xl shadow-white/10"
            >
              Try dPIN Today
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Comparison;
