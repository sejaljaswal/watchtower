import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { AlertCircle, ArrowLeft, Bell, CheckCircle, Clock, Cpu, Globe, Server, Shield, XCircle, FileText } from "lucide-react";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusHistory from "./StatusHistory";
import MonitorStats from "./MonitorStats";
import RecentEvents from "./RecentEvents";
import MonitorHeader from "./MonitorHeader";
import PerformanceMetrics from "./PerformanceMetrics";
import ValidatorMap from "./ValidatorMap";
import { useAuth } from "@clerk/clerk-react";

const MonitorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const fetchMonitorData = async () => {
    try {
      const response = await fetch(`http://localhost:3000/website-details/${id}`);
      if (!response.ok) {
        console.error(`[MonitorDetails] API error: ${response.status}`);
        setLoading(false);
        return; // Don't set monitor to the error response object
      }
      const data = await response.json();
      console.log(data);
      setMonitor(data);
    } catch (err) {
      console.error('[MonitorDetails] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData(); // Initial fetch

    const interval = setInterval(() => {
      fetchMonitorData(); // Fetch every minute
    }, 60000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [id, getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Monitor Not Found</h2>
          <p className="text-gray-400 mb-8">The monitor you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const formatMonitoringSince = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  const formatUptimePercentage = (percentage) => {
    if (percentage == null || isNaN(percentage)) return "0.00";
    return Number(percentage).toFixed(2);
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <div className="mb-6">
        <MonitorHeader
          name={monitor.websiteName}
          url={monitor.url}
          status={monitor.disabled ? "down" : "up"}
          uptimePercentage={monitor.uptimePercentage}
          disabled={monitor.disabled}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gray-800/40 border-gray-700 animate-slide-up">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-400">Status</p>
              <Badge 
                className={`${
                  !monitor.disabled 
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {!monitor.disabled ? "Operational" : "Down"}
              </Badge>
            </div>
            <div className="flex items-center">
              {!monitor.disabled ? (
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500 mr-3" />
              )}
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatUptimePercentage(monitor.uptimePercentage)}%
                </p>
                <p className="text-xs text-gray-400">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/40 border-gray-700 animate-slide-up [animation-delay:100ms]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-400">Response Time</p>
              <Badge 
                className={`${
                  parseFloat(monitor.response) < 200 
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                    : parseFloat(monitor.response) < 500 
                    ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                }`}
              >
                {parseFloat(monitor.response) < 200 ? "Fast" : parseFloat(monitor.response) < 500 ? "Average" : "Slow"}
              </Badge>
            </div>
            <div className="flex items-center">
              <Cpu className="h-8 w-8 text-indigo-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-white">{monitor.response}ms</p>
                <p className="text-xs text-gray-400">Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/40 border-gray-700 animate-slide-up [animation-delay:200ms]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-400">Monitoring Since</p>
              <Badge className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                Active
              </Badge>
            </div>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-white">{formatMonitoringSince(monitor.dateCreated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        {/* Live Validator World Map */}
        <ValidatorMap
          websiteId={id}
          websiteName={monitor.websiteName}
          websiteUrl={monitor.url}
          websiteStatus={monitor.disabled ? "down" : "up"}
        />

        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/70 p-6 animate-slide-up">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
              Status Timeline
            </h2>
            <p className="text-sm text-gray-400">Last 30 minutes of monitoring data</p>
          </div>
          <StatusHistory statusHistory={monitor.averageLatencyPerMinute?.slice(0, Math.min(50, monitor.averageLatencyPerMinute?.length || 0))} uptimePercentage={monitor.uptimePercentage} />
        </div>

        <MonitorStats 
          responseTime={parseFloat(monitor.response)} 
          avgResponseTime={parseFloat(monitor.response)}
          uptimePercentage={monitor.uptimePercentage} 
          status={monitor.disabled ? "down" : "up"}
        />

        <Card className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
                <p className="text-white text-[22px]">Response Time Monitor</p>
            </CardTitle>
            <CardDescription><p className="text-[#9CA3AF]">Real-time data refreshing every minute</p></CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseTimeChart 
              initialData={(monitor.averageLatencyPerMinute || []).map((latency) => ({
                name: new Date(latency.timestamp).toLocaleTimeString(),
                responseTime: latency.averageLatency
              }))}
              refreshInterval={60000} 
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentEvents events={monitor.downlog} />
          
          <Card className="bg-gray-800/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg"><p className="text-white text-[20px]">Monitor Details</p></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-400">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Check Frequency</span>
                </div>
                <span className="text-white">60 seconds</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-400">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Successful Checks</span>
                </div>
                <span className="text-white">{monitor.goodTicks.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-400">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span>Failed Checks</span>
                </div>
                <span className="text-white">{(monitor.totalTicks - monitor.goodTicks).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-400">
                  <Server className="h-4 w-4 mr-2" />
                  <span>Nodes</span>
                </div>
                <span className="text-white">{monitor.totalValidator} nodes</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <PerformanceMetrics 
          responseTime={parseFloat(monitor.response)}
          previousResponseTime={parseFloat(monitor.response)}
          uptime={monitor.uptimePercentage}
        />

        <Card className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-400" />
              <p className="text-white text-[22px]">Blockchain Transactions</p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monitor.blockchainLogs && monitor.blockchainLogs.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {monitor.blockchainLogs.map((log: any) => (
                  <div key={log._id} className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
                    <p className="text-sm text-gray-300">{log.message.replace(id, monitor.url)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    {log.metadata?.signature ? (
                      <a href={`https://explorer.solana.com/tx/${log.metadata.signature}?cluster=devnet`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 mt-2 bg-indigo-500/10 px-2.5 py-1.5 rounded-md border border-indigo-500/20 transition-colors w-fit">
                        <Globe className="h-3.5 w-3.5" />
                        Verify on Solana Explorer
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500 mt-2 inline-block italic bg-gray-800 px-2 py-1 rounded-md">Simulated Transaction (No Signature)</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No blockchain transactions found for this website yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gray-800/40 border-gray-700 hover:border-gray-600 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-pink-400" />
              <p className="text-white text-[22px]">Hourly On-Chain Snapshots</p>
            </CardTitle>
            <CardDescription><p className="text-[#9CA3AF]">Immutable hourly performance records</p></CardDescription>
          </CardHeader>
          <CardContent>
            {monitor.hourlySummaries && monitor.hourlySummaries.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {monitor.hourlySummaries.map((log: any) => (
                  <div key={log._id} className="p-4 bg-gray-900/50 rounded-md border border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-pink-500/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm text-gray-300 font-medium">Uptime:</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.metadata.uptime < 100 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                          {log.metadata.uptime.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Down Checks: {log.metadata.downChecks} | Avg Latency: {Math.round(log.metadata.avgLatency)}ms</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                    {log.metadata?.signature ? (
                      <a href={`https://explorer.solana.com/tx/${log.metadata.signature}?cluster=devnet`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-pink-400 hover:text-pink-300 bg-pink-500/10 px-3 py-2 rounded-md border border-pink-500/20 transition-all hover:bg-pink-500/20 w-fit whitespace-nowrap">
                        <Globe className="h-3.5 w-3.5" />
                        Verify Ledger
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500 inline-block italic bg-gray-800 px-3 py-2 rounded-md">Simulated (No Signature)</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No hourly snapshots recorded yet.</p>
                <p className="text-gray-500 text-xs mt-1">Data will appear here after the first hour of monitoring.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitorDetails;