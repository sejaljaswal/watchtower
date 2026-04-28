import React, { useEffect, useState } from "react";
import { Plus, Search, Filter, BarChart, AlertCircle, Bell, Settings, ArrowRight, Clock, User, Cpu, X, Trash2, Power } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { NoiseBackground } from "@/components/ui/noise-background";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatencyData {
  averageLatency: number;
}

interface Monitor {
  id: string;
  websiteName: string;
  url: string;
  disabled: boolean;
  response: number;
  uptimePercentage: number;
  averageLatencyPerMinute: LatencyData[];
}

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const Button = ({
  children,
  onClick,
  className = "",
  variant = "default",
  disabled = false,
  type = "button",
}: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
    ${
      variant === "default"
        ? "bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5"
        : variant === "outline"
        ? "border border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800 hover:text-white rounded-full"
        : variant === "ghost"
        ? "text-gray-300 hover:bg-gray-800 hover:text-white rounded-full"
        : ""
    } ${className}`}
  >
    {children}
  </button>
);

// ─── MonitorCard ──────────────────────────────────────────────────────────────

interface MonitorCardProps {
  monitor: Monitor;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  isActive: boolean;
}

const MonitorCard = ({ monitor, onDelete, onToggle, isActive }: MonitorCardProps) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(monitor.id);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle(monitor.id);
  };

  const averageLatencyPerMinute = monitor.averageLatencyPerMinute || [];
  const lastResponse =
    averageLatencyPerMinute[averageLatencyPerMinute.length - 1]?.averageLatency;
  const status = typeof lastResponse === "number" && lastResponse > 0 ? "up" : "down";
  const uptimePercentage = monitor.uptimePercentage || 0;

  return (
    <CardContainer className="inter-var w-full h-full">
      <CardBody
        className={`w-full h-full rounded-xl border ${
          isActive ? "border-gray-700 bg-gray-800/80" : "border-gray-700/50 bg-gray-800/40"
        } text-white shadow-lg overflow-hidden hover:shadow-2xl dark:hover:shadow-indigo-500/10 transition-all duration-300 relative group/card flex flex-col`}
      >
        <a
          href={`/monitor/${monitor.id}`}
          className={`block flex flex-col flex-grow ${!isActive && "opacity-70"}`}
        >
          <div className="p-5 flex-grow">
            <div className="flex justify-between items-start mb-3">
              <CardItem translateZ="50" className="flex items-center">
                <span className="relative flex h-3 w-3 mr-3">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full ${
                      !isActive
                        ? "bg-gray-500"
                        : status === "up"
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                  {isActive && status !== "up" && (
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75 bg-rose-500 animate-ping" />
                  )}
                </span>
                <h3 className="text-lg font-bold">{monitor.websiteName}</h3>
              </CardItem>
              <CardItem
                translateZ="60"
                className={`${
                  !isActive
                    ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    : status === "up"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                } text-xs font-medium px-2.5 py-1 rounded-full border`}
              >
                {!isActive ? "Inactive" : status === "up" ? "Operational" : "Down"}
              </CardItem>
            </div>

            <div className="flex justify-between items-center mb-4 relative z-20">
              <CardItem translateZ="80">
                <button
                  onClick={handleDeleteClick}
                  className="p-2 bg-gray-700/70 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 opacity-0 group-hover/card:opacity-100 transition-all shadow-sm"
                  title="Delete monitor"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </CardItem>

              <CardItem translateZ="80">
                <button
                  onClick={handleToggleClick}
                  className={`p-2 rounded-lg transition-all shadow-sm ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
                      : "bg-gray-700/70 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                  title={isActive ? "Disable monitor" : "Enable monitor"}
                >
                  <Power className="h-5 w-5" />
                </button>
              </CardItem>
            </div>

            <CardItem translateZ="40" as="p" className="text-sm text-gray-400 mb-4 truncate w-full">
              {monitor.url}
            </CardItem>

            <CardItem translateZ="70" className="grid grid-cols-2 gap-3 mb-5 w-full">
              <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1 flex items-center">
                  <Clock className="h-3 w-3 mr-1.5" />
                  Uptime
                </p>
                <p className="text-xl font-bold">
                  {isActive ? uptimePercentage.toFixed(2) : "0.00"}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1 flex items-center">
                  <Cpu className="h-3 w-3 mr-1.5" />
                  Response
                </p>
                <div className="flex items-center">
                  <p className="text-xl font-bold">{isActive ? monitor.response : "—"}ms</p>
                </div>
              </div>
            </CardItem>

            <CardItem translateZ="30" className="h-16 mb-3 relative w-full">
              <div className="absolute inset-0 flex items-end gap-0.5">
                {isActive ? (
                  averageLatencyPerMinute
                    .slice(0, Math.min(50, averageLatencyPerMinute?.length || 0))
                    .map((latencyData: LatencyData, i: number) => (
                      <div
                        key={i}
                        style={{
                          height: `${
                            latencyData.averageLatency > 0
                              ? Math.min(latencyData.averageLatency / 10, 100)
                              : 10
                          }%`,
                        }}
                        className={`flex-1 ${
                          latencyData.averageLatency === 0
                            ? "bg-gradient-to-t from-rose-500/90 to-rose-400/50"
                            : "bg-gradient-to-t from-emerald-500/90 to-emerald-400/50"
                        } rounded-t-sm`}
                      />
                    ))
                ) : (
                  Array(30)
                    .fill(null)
                    .map((_, i: number) => (
                      <div
                        key={i}
                        style={{ height: `${Math.random() * 30 + 20}%` }}
                        className="flex-1 bg-gradient-to-t from-gray-500/30 to-gray-400/10 rounded-t-sm"
                      />
                    ))
                )}
              </div>
            </CardItem>
          </div>
          <CardItem translateZ="50" className="w-full">
            <div className="bg-gray-900 p-3 border-t border-gray-700 hover:bg-gray-800 transition-colors w-full rounded-b-xl">
              <div className="text-sm text-gray-300 hover:text-white w-full flex justify-between items-center transition-colors">
                View Details
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </CardItem>
        </a>
      </CardBody>
    </CardContainer>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "green" | "red" | "blue" | "yellow";
}

const StatCard = ({ title, value, icon, color }: StatCardProps) => (
  <div
    className={`rounded-2xl border p-6 shadow-md relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group bg-gray-800/60 ${
      color === "green"
        ? "border-emerald-500/30"
        : color === "red"
        ? "border-rose-500/30"
        : color === "blue"
        ? "border-indigo-500/30"
        : color === "yellow"
        ? "border-amber-500/30"
        : ""
    }`}
  >
    <div className="flex items-center justify-between relative z-10">
      <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
        {title}
      </p>
      <div
        className={`rounded-full p-2 border ${
          color === "green"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : color === "red"
            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
            : color === "blue"
            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            : color === "yellow"
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : ""
        }`}
      >
        {icon}
      </div>
    </div>
    <p className="text-4xl font-bold text-white mt-4 tracking-tight relative z-10">{value}</p>
  </div>
);

// ─── AddMonitor ───────────────────────────────────────────────────────────────

interface AddMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (monitor: Monitor) => void;
}

const AddMonitor = ({ isOpen, onClose, onAdd }: AddMonitorProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      if (!isLoaded || !isSignedIn || !user?.id) {
        throw new Error("User session is not ready");
      }

      const userId = user.id;
      const response = await fetch("http://localhost:3000/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteName: name, url, userId }),
      });

      if (!response.ok) throw new Error("Failed to add monitor");

      const newMonitor: Monitor = await response.json();
      onAdd(newMonitor);
      setName("");
      setUrl("");
      onClose();
    } catch {
      setError("Failed to add monitor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 pointer-events-none" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors z-20"
        >
          <X className="h-5 w-5" />
        </button>
        <form onSubmit={handleSubmit} className="p-8 relative z-10">
          <h2 className="text-2xl font-semibold mb-1 text-white">Add Monitor</h2>
          <p className="mb-6 text-gray-400">
            Enter the details of the website you want to monitor.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Monitor Name
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="My Website"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">URL</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="https://example.com"
                value={url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-8">
            <Button onClick={onClose} variant="ghost" className="text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Monitor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── PushoverSettings ───────────────────────────────────────────────────────────

interface PushoverSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PushoverSettings = ({ isOpen, onClose }: PushoverSettingsProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [pushoverUserKey, setPushoverUserKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);
    try {
      if (!isLoaded || !isSignedIn || !user?.id) {
        throw new Error("User session is not ready");
      }

      const userId = user.id;
      const response = await fetch("http://localhost:3000/user/pushover", {
        method: "PUT",
        headers: { "Content-Type": "application/json", userId },
        body: JSON.stringify({ pushoverUserKey }),
      });

      if (!response.ok) throw new Error("Failed to update settings");

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch {
      setError("Failed to update settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 pointer-events-none" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors z-20"
        >
          <X className="h-5 w-5" />
        </button>
        <form onSubmit={handleSubmit} className="p-8 relative z-10">
          <h2 className="text-2xl font-semibold mb-1 text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-400" />
            Alert Settings
          </h2>
          <p className="mb-6 text-gray-400 text-sm">
            Configure your Pushover User Key to receive emergency "Buzzer" notifications on your phone when a website goes down.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {success && <p className="text-emerald-400 text-sm mb-4">Settings saved successfully!</p>}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Pushover User Key
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g. u1234567890abcdef..."
                value={pushoverUserKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPushoverUserKey(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to disable mobile alerts.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-8">
            <Button onClick={onClose} variant="ghost" className="text-sm">
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DeleteDialog {
  isOpen: boolean;
  monitorId: string | null;
  monitorName: string;
}

const Dashboard = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isAddMonitorOpen, setIsAddMonitorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [monitorsActive, setMonitorsActive] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>({
    isOpen: false,
    monitorId: null,
    monitorName: "",
  });

  const fetchDashboardDetails = async () => {
    const userId = user?.id;
    if (!userId || !isSignedIn) return;

    try {
      const response = await fetch("http://localhost:3000/dashboard-details", {
        method: "GET",
        headers: { "Content-Type": "application/json", userId },
      });

      if (!response.ok) throw new Error("Failed to fetch dashboard details");

      const data: { websites: Monitor[] } = await response.json();
      setMonitors(Array.isArray(data.websites) ? data.websites : []);
    } catch (error) {
      console.error("Error fetching dashboard details:", error);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    fetchDashboardDetails();
    const interval = setInterval(fetchDashboardDetails, 60000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, user?.id]);

  const handleAddMonitor = (newMonitor: any) => {
    // POST /website returns a raw mongoose doc with _id, not id.
    // Normalize it so the card's href correctly links to /monitor/:id
    const normalized: Monitor = { ...newMonitor, id: newMonitor._id || newMonitor.id };
    setMonitors((current) => [...current, normalized]);
  };

  const handleDeleteMonitor = async (monitorId: string) => {
    try {
      const userId = user?.id;
      if (!userId) throw new Error("User session is not ready");

      const response = await fetch(`http://localhost:3000/website/${monitorId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", userId },
      });

      if (!response.ok) throw new Error("Failed to delete monitor");

      setMonitors((current) => current.filter((m) => m.id !== monitorId));
      setDeleteDialog({ isOpen: false, monitorId: null, monitorName: "" });
    } catch (error) {
      console.error("Error deleting monitor:", error);
    }
  };

  const handleToggleMonitor = async (monitorId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/website-track/${monitorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to toggle monitor");

      const data: { website: Monitor } = await response.json();
      const updatedWebsite = data.website;
      if (!updatedWebsite) throw new Error("Toggle response did not include the updated monitor");

      setMonitors((current) =>
        current.map((m) => (m.id === monitorId ? { ...m, ...updatedWebsite } : m))
      );
    } catch (error) {
      console.error("Error toggling monitor:", error);
    }
  };

  const filteredMonitors = monitors.filter((monitor) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      monitor.websiteName.toLowerCase().includes(query) ||
      monitor.url.toLowerCase().includes(query)
    );
  });

  const totalMonitors = monitors.length;
  const enabledCount = monitors.filter((m) => !m.disabled).length;
  const disabledCount = monitors.filter((m) => m.disabled).length;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <div className="flex items-center gap-3 rounded-full border border-gray-700 bg-gray-800/80 px-5 py-3 shadow-lg">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-12 animate-fade-in bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Delete confirmation dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2 text-white">Delete Monitor</h2>
              <p className="mb-6 text-gray-300">
                Are you sure you want to delete this monitor?{" "}
                <span className="font-medium text-white">"{deleteDialog.monitorName}"</span> will
                be permanently removed.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() =>
                    setDeleteDialog({ isOpen: false, monitorId: null, monitorName: "" })
                  }
                  variant="ghost"
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    deleteDialog.monitorId && handleDeleteMonitor(deleteDialog.monitorId)
                  }
                  variant="default"
                  className="text-sm bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-md hover:shadow-lg shadow-red-500/20"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container px-4 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10 mb-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white pb-2">
                Dashboard
              </h1>
              <p className="text-gray-400 text-base md:text-lg max-w-xl">
                Welcome back! Here's the current status and performance of your monitoring systems.
              </p>
            </div>
            <div className="flex gap-3 pb-1">
              <NoiseBackground
                containerClassName="w-fit p-[2px] rounded-full"
                gradientColors={["rgb(255, 100, 150)", "rgb(100, 150, 255)", "rgb(255, 200, 100)"]}
              >
                <button
                  onClick={() => setIsAddMonitorOpen(true)}
                  className="flex items-center gap-2 h-full w-full cursor-pointer rounded-full bg-gradient-to-r from-neutral-100 via-neutral-100 to-white px-5 py-2.5 text-black shadow-[0_2px_0_0_#f9fafb_inset,0_0.5px_1px_0_#9ca3af] transition-all duration-100 active:scale-95 dark:from-black dark:via-black dark:to-neutral-900 dark:text-white dark:shadow-[0_1px_0_0_#0a0a0a_inset,0_1px_0_0_#262626] text-sm font-semibold"
                >
                  <Plus className="h-5 w-5" />
                  Add Monitor
                </button>
              </NoiseBackground>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center p-3 rounded-full bg-gray-800/80 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-all shadow-sm"
                title="Alert Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Monitors"
              value={totalMonitors.toString()}
              icon={<BarChart className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Operational"
              value={enabledCount.toString()}
              icon={<Cpu className="h-5 w-5" />}
              color="green"
            />
            <StatCard
              title="Paused"
              value={disabledCount.toString()}
              icon={<AlertCircle className="h-5 w-5" />}
              color="red"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-5 bg-gray-800/60 p-5 rounded-2xl border border-gray-700 shadow-md relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Monitors</h2>
            {!monitorsActive && (
              <span className="ml-2 bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-500/20">
                All Monitoring Disabled
              </span>
            )}
          </div>

          <div className="flex w-full md:w-auto gap-3 relative z-10">
            <div className="relative flex-grow md:flex-grow-0 group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Search monitors..."
                className="pl-11 pr-10 py-3 w-full md:w-72 lg:w-80 rounded-full border border-white/10 bg-black/40 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-black/60 transition-all placeholder-gray-500 shadow-inner"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" className="gap-2 px-5" onClick={() => {}}>
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {!monitorsActive ? (
          <div className="flex flex-col items-center justify-center py-16 border border-gray-700 rounded-xl bg-gray-800/50 backdrop-blur-sm">
            <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/30">
              <Power className="h-10 w-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-medium mb-3 text-white">Monitors Are Turned Off</h3>
            <p className="text-gray-400 text-center max-w-md mb-8">
              All monitoring activities are currently disabled. Click the button below to resume
              monitoring your systems.
            </p>
            <Button onClick={() => setMonitorsActive(true)} className="px-6 py-2.5 text-base">
              <Power className="h-5 w-5 mr-2" />
              Turn On All Monitors
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMonitors.map((monitor) => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onDelete={(id: string) =>
                  setDeleteDialog({ isOpen: true, monitorId: id, monitorName: monitor.websiteName })
                }
                onToggle={handleToggleMonitor}
                isActive={!monitor.disabled}
              />
            ))}
          </div>
        )}

        {monitorsActive && filteredMonitors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border border-gray-700 rounded-xl bg-gray-800/50 backdrop-blur-sm">
            <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/30">
              {searchQuery ? (
                <Search className="h-10 w-10 text-indigo-400" />
              ) : (
                <BarChart className="h-10 w-10 text-indigo-400" />
              )}
            </div>
            <h3 className="text-2xl font-medium mb-3 text-white">
              {searchQuery ? "No matching monitors found" : "No monitors yet"}
            </h3>
            <p className="text-gray-400 text-center max-w-md mb-8">
              {searchQuery
                ? `No monitors matching "${searchQuery}" were found. Try a different search term or add a new monitor.`
                : "Get started by adding your first monitor to keep track of your websites and services."}
            </p>
            <div className="flex gap-4">
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery("")}
                  variant="outline"
                  className="px-6 py-2.5 text-base"
                >
                  Clear Search
                </Button>
              )}
              <Button
                onClick={() => setIsAddMonitorOpen(true)}
                className="px-6 py-2.5 text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                {searchQuery ? "Add New Monitor" : "Add Your First Monitor"}
              </Button>
            </div>
          </div>
        )}

        <AddMonitor
          isOpen={isAddMonitorOpen}
          onClose={() => setIsAddMonitorOpen(false)}
          onAdd={handleAddMonitor}
        />
        <PushoverSettings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;