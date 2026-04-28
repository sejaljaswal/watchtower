import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import MonitorStats from "./MonitorStats";
import UptimeChart from "./UptimeChart";
import ResponseTimeChart from "./ResponseTimeChart";
import StatusHistory from "./StatusHistory";
import RecentEvents from "./RecentEvents";
import MonitorDetails from "./MonitorDetails";
import AlertSettings from "./AlertSettings";

interface DetailsDashboardProps {
  monitor: {
    id: string;
    name: string;
    url: string;
    status: "up" | "down" | "warning";
    uptimePercentage: number;
    responseTime: number;
    checkFrequency: number;
    statusHistory: {
      status: "up" | "down";
      length: number;
    }[];
    responseTimeHistory: { 
      name: string; 
      responseTime: number 
    }[];
    recentEvents: {
      id: number;
      type: "up" | "down" | "warning" | "info";
      timestamp: Date;
      duration: string | null;
      message: string;
    }[];
    monitoringSince: Date;
    regions: string[];
    checks: {
      total: number;
      success: number;
      failed: number;
    };
    alertsEnabled: boolean;
    alertChannels: string[];
    blockchainLogs?: {
      _id: string;
      message: string;
      metadata?: { signature?: string };
      createdAt: string;
    }[];
  };
}

const DetailsDashboard: React.FC<DetailsDashboardProps> = ({ monitor }) => {
  const [activeChainTab, setActiveChainTab] = useState("all");

  return (
    <div className="space-y-6">
      <MonitorStats 
        uptime={monitor.uptimePercentage}
        responseTime={monitor.responseTime}
        checks={monitor.checks}
        monitoringSince={monitor.monitoringSince}
      />
      
      <Tabs defaultValue="uptime" className="space-y-4">
        <TabsList className="bg-gray-800/40 border border-gray-700 w-full justify-start">
          <TabsTrigger value="uptime">Uptime</TabsTrigger>
          <TabsTrigger value="response">Response Time</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
        </TabsList>
        
        <TabsContent value="uptime" className="space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-6">
            <div className="h-[400px]">
              <StatusHistory statusHistory={monitor.statusHistory} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="response" className="space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-6">
            <div className="h-[400px]">
              <ResponseTimeChart data={monitor.responseTimeHistory} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-6">
            <RecentEvents events={monitor.recentEvents} />
          </div>
        </TabsContent>

        <TabsContent value="blockchain" className="space-y-4">
          <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Blockchain Transactions</h3>
            </div>
            
            {/* Subtabs for On-Chain History */}
            <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
              <button 
                onClick={() => setActiveChainTab("all")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "all" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent"}`}
              >
                All Logs
              </button>
              <button 
                onClick={() => setActiveChainTab("hourly")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "hourly" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent"}`}
              >
                Hourly Snapshots
              </button>
              <button 
                onClick={() => setActiveChainTab("status")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeChainTab === "status" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-transparent"}`}
              >
                Status Changes
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {monitor.blockchainLogs && monitor.blockchainLogs.filter(log => {
                if (activeChainTab === "all") return true;
                if (activeChainTab === "hourly") return log.eventType === 'BLOCKCHAIN_HOURLY_SUMMARY';
                if (activeChainTab === "status") return log.eventType === 'BLOCKCHAIN_LEDGER';
                return true;
              }).length > 0 ? (
                <div className="space-y-3">
                  {monitor.blockchainLogs.filter(log => {
                    if (activeChainTab === "all") return true;
                    if (activeChainTab === "hourly") return log.eventType === 'BLOCKCHAIN_HOURLY_SUMMARY';
                    if (activeChainTab === "status") return log.eventType === 'BLOCKCHAIN_LEDGER';
                    return true;
                  }).map(log => (
                    <div key={log._id} className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        {log.eventType === 'BLOCKCHAIN_HOURLY_SUMMARY' ? (
                          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-medium border border-blue-500/30">Hourly Snapshot</span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-medium border border-emerald-500/30">Status Change</span>
                        )}
                        <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{log.message}</p>
                      {log.metadata?.signature ? (
                        <a href={`https://explorer.solana.com/tx/${log.metadata.signature}?cluster=devnet`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/30 px-3 py-1.5 rounded-md border border-indigo-500/30 transition-all mt-2 w-fit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                          Verify Tx
                        </a>
                      ) : (
                        <span className="inline-block text-xs text-gray-500 italic bg-black/50 px-2 py-1 rounded mt-2">Simulated</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No blockchain transactions found for this filter.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Uptime Chart</h3>
          <div className="h-[200px]">
            <UptimeChart statusHistory={monitor.statusHistory} />
          </div>
        </div>
        
        <MonitorDetails 
          checkFrequency={monitor.checkFrequency}
          regions={monitor.regions}
        />
      </div>
      
      <AlertSettings 
        alertsEnabled={monitor.alertsEnabled}
        alertChannels={monitor.alertChannels}
      />
    </div>
  );
};

export default DetailsDashboard;
