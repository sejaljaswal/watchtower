import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, XAxis, CartesianGrid, YAxis, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { ArrowUpRight, BarChart3, PieChart as PieChartIcon, TrendingUp, BellRing, Zap, Clock, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

const chartData = [
  { time: '1 min', latency: 100 },
  { time: '2 min', latency: 80 },
  { time: '3 min', latency: 250 },
  { time: '4 min', latency: 200 },
  { time: '5 min', latency: 180 },
  { time: '6 min', latency: 300 },
  { time: '7 min', latency: 250 },
  { time: '8 min', latency: 280 },
  { time: '9 min', latency: 200 },
  { time: '10 min', latency: 150 },
];

const pipelineData = [
  { id: '01', name: 'Database Performance', progress: 98.8, color: '#FFB547' },
  { id: '02', name: 'Successful Transactions', progress: 95, color: '#3DD2B4' },
  { id: '03', name: 'Monitoring Accuracy', progress: 96.5, color: '#F06292' },
];

const ProgressBar = ({ progress, color }) => {
  const [isVisible, setIsVisible] = useState(false);
  const progressRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (progressRef.current) {
      observer.observe(progressRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full bg-gray-900/80 rounded-full h-2.5 border border-white/5 shadow-inner" ref={progressRef}>
      <div
        className="h-full rounded-full transition-all duration-[1500ms] ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ 
          width: isVisible ? `${progress}%` : '0%',
          backgroundColor: color,
          boxShadow: isVisible ? `0 0 10px ${color}80` : 'none'
        }}
      />
    </div>
  );
};

const CircleProgress = ({ progress }) => {
  const [isVisible, setIsVisible] = useState(false);
  const circleRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (circleRef.current) {
      observer.observe(circleRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-28 h-28 relative" ref={circleRef}>
      <div className="absolute inset-0 bg-[#3868F9]/10 rounded-full blur-xl" />
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-xl relative z-10">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#3868F9"
          strokeWidth="8"
          strokeDasharray={`${isVisible ? progress * 2.83 : 0} ${100 * 2.83}`}
          strokeLinecap="round"
          style={{ transition: 'all 1.5s ease-out', filter: 'drop-shadow(0 0 4px rgba(56,104,249,0.5))' }}
          className="transition-all ease-out"
        />
      </svg>
    </div>
  );
};

const pieData = [
  { name: 'US East', value: 400 },
  { name: 'US West', value: 300 },
  { name: 'EU Central', value: 300 },
  { name: 'AP South', value: 200 },
];
const PIE_COLORS = ['#3868F9', '#3DD2B4', '#FFB547', '#F06292'];

const LivePieChart = () => {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={65}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip 
          contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
          itemStyle={{ color: '#E5E7EB' }}
          cursor={false}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const GradientChart = () => {
  const [liveData, setLiveData] = useState(chartData);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(current => {
        const newData = [...current.slice(1)];
        const lastTimeStr = newData[newData.length - 1].time;
        const lastTime = parseInt(lastTimeStr);
        const nextTime = `${lastTime + 1} min`;
        
        const prevLatency = newData[newData.length - 1].latency;
        const change = (Math.random() * 60) - 30;
        let randomLatency = prevLatency + change;
        if(randomLatency < 50) randomLatency = 50 + Math.random() * 20;
        if(randomLatency > 350) randomLatency = 350 - Math.random() * 20;
        
        newData.push({ time: nextTime, latency: randomLatency });
        return newData;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={liveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3868F9" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3868F9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          padding={{ left: 1, right: 0 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          domain={[0, 400]}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="#3868F9"
          strokeWidth={3}
          dot={false}
          fill="url(#colorGradient)"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const AnimatedNumber = ({ value, suffix = '', decimals = 0, startFrom }) => {
  const [displayValue, setDisplayValue] = useState(startFrom ?? 0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2500;
    const steps = 100;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const startValue = startFrom ?? 0;
    const valueRange = value - startValue;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (valueRange * easedProgress);
      const factor = Math.pow(10, decimals);
      setDisplayValue(Math.round(currentValue * factor) / factor);

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, isVisible, decimals, startFrom]);

  return (
    <span ref={counterRef}>
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

const StatCard = ({ title, value, subtitle, icon: Icon, startFrom, percentage, color }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group bg-gray-800/60 border ${
        color === "green" ? "border-emerald-500/30 hover:border-emerald-500/50" : 
        color === "red" ? "border-rose-500/30 hover:border-rose-500/50" : 
        color === "blue" ? "border-indigo-500/30 hover:border-indigo-500/50" : 
        color === "yellow" ? "border-amber-500/30 hover:border-amber-500/50" : "border-gray-700 hover:border-gray-600"}`}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-white/80 font-medium group-hover:text-white transition-colors text-sm">{title}</h3>
        <div className={`rounded-full p-2 border ${
          color === "green" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
          color === "red" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
          color === "blue" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : 
          color === "yellow" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-gray-800 text-gray-400 border-gray-700"
        }`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-end gap-3 mb-2 relative z-10">
        <span className="text-3xl font-bold text-white tracking-tight">
          <AnimatedNumber 
            value={parseFloat(value)} 
            suffix={value.includes('/') ? `/${value.split('/')[1]}` : value.includes('%') ? '%' : ''} 
            decimals={value.includes('/') || value.includes('%') ? 0 : 1}
            startFrom={startFrom}
          />
        </span>
        <span className={`flex items-center text-sm font-medium mb-1 ${
          percentage > 0 ? "text-emerald-400" : "text-rose-400"
        }`}>
          {percentage > 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : null}
          {percentage}%
        </span>
      </div>
      <p className="text-gray-400 text-sm relative z-10">{subtitle}</p>
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${
        color === "green" ? "bg-emerald-500" : 
        color === "red" ? "bg-rose-500" : 
        color === "blue" ? "bg-indigo-500" : 
        color === "yellow" ? "bg-amber-500" : "bg-gray-500"
      }`} />
    </motion.div>
  );
};

const Features = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  
  const handleStartMonitoringClick = () => {
    // For regular users, check if signed in with Clerk and redirect accordingly
    if (isSignedIn) {
      navigate('/dashboard');
    } else {
      // Changed to direct to validator dashboard without authentication
      navigate('/validator-dashboard');
    }
  };

  return (
    <div id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Enterprise Monitoring Made Simple
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            dPIN provides all the tools you need to monitor, analyze, and improve your website's performance.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* Performance Analysis Card */}
            <div className="w-full md:w-[30%] bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-md hover:border-gray-600 transition-colors group">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">Service Status</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Real-time monitoring metrics
                </p>
              </div>
              <div className="flex justify-between items-center mt-8">
                <div>
                  <div className="text-4xl font-bold text-white tracking-tight">99.9%</div>
                  <div className="text-gray-400 text-sm font-medium mt-1">Service Uptime</div>
                </div>
                <CircleProgress progress={99.9} />
              </div>
            </div>

            {/* Trend Chart Card */}
            <div className="w-full md:w-[70%] bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 border border-gray-700 shadow-md hover:border-gray-600 transition-colors">
              <div className="flex flex-col md:flex-row gap-6 h-full">
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white tracking-tight">Response Time (Live)</h2>
                      <p className="text-gray-400 text-sm mt-1">
                        Average response times tracking real-time latency
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[150px]">
                    <GradientChart />
                  </div>
                </div>
                
                {/* Traffic Distribution Pie Chart */}
                <div className="w-full md:w-1/3 flex flex-col border-t md:border-t-0 md:border-l border-gray-700 pt-6 md:pt-0 md:pl-6">
                  <div className="mb-2">
                    <h2 className="text-lg font-semibold text-white tracking-tight">Traffic Nodes</h2>
                    <p className="text-gray-400 text-xs mt-1">Live requests routing distribution</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-[150px]">
                    <LivePieChart />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Component Stats Section */}
          <div className="mt-6 bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-gray-700 shadow-md">
            <h2 className="text-xl font-semibold text-white tracking-tight mb-2">Service Health</h2>
            <p className="text-gray-400 mb-8 text-sm">
              Key performance indicators for your monitored services.
            </p>
            <div className="space-y-4">
              {pipelineData.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 rounded-xl bg-gray-900/40 border border-white/5 hover:bg-gray-900/60 transition-colors">
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <div className="text-gray-500 font-mono text-sm">{item.id}</div>
                    <div className="text-gray-200 font-medium">{item.name}</div>
                  </div>
                  <div className="flex-1 flex items-center gap-4 w-full">
                    <div className="flex-1">
                      <ProgressBar progress={item.progress} color={item.color} />
                    </div>
                    <div className="text-white font-semibold px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm min-w-[70px] text-center shadow-sm">
                      {item.progress}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <StatCard
              title="Average Response Time"
              value="288ms"
              subtitle="Across all monitored endpoints"
              icon={Clock}
              percentage={12}
              color="blue"
            />
            <StatCard
              title="Alerts Sent"
              value="2,345"
              subtitle="This month via email, SMS & Slack"
              icon={BellRing}
              percentage={18}
              color="yellow"
            />
            <StatCard
              title="User Satisfaction"
              value="91%"
              subtitle="Positive feedback from users"
              icon={Smile}
              percentage={63}
              color="green"
            />
          </div>
        </motion.div>
        <div className="text-center mt-12">
        </div>
      </div>
    </div>
  );
};

export default Features;