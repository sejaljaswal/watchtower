import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidatorData {
  validatorId: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  trustScore: number;
  latestStatus: "Good" | "Bad" | string;
  latency: number;
  lastChecked: string;
}

interface ValidatorMapProps {
  websiteId: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteStatus?: "up" | "down" | "warning";
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const getMarkerColor = (status: string) => {
  if (status === "Good") return "#22c55e"; // green-500
  if (status === "Bad") return "#ef4444";  // red-500
  return "#eab308";                         // yellow-500 (unknown/warning)
};

const getMarkerPulse = (status: string) => status === "Bad";

const statusLabel = (status: string) => {
  if (status === "Good") return "UP";
  if (status === "Bad") return "DOWN";
  return "WARNING";
};

// ─── Fit bounds helper ────────────────────────────────────────────────────────

const FitBounds = ({ validators }: { validators: ValidatorData[] }) => {
  const map = useMap();
  useEffect(() => {
    const valid = validators.filter(
      (v) => v.latitude != null && v.longitude != null
    );
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 5);
      return;
    }
    const lats = valid.map((v) => v.latitude);
    const lngs = valid.map((v) => v.longitude);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [50, 50], maxZoom: 8 }
    );
  }, [validators.length]);
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ValidatorMap: React.FC<ValidatorMapProps> = ({
  websiteId,
  websiteName,
  websiteUrl,
  websiteStatus,
}) => {
  const [validators, setValidators] = useState<ValidatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // ── Initial fetch via REST ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchValidators = async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/website/${websiteId}/validators`
        );
        if (!res.ok) throw new Error("Failed to fetch validators");
        const data: ValidatorData[] = await res.json();
        setValidators(data);
      } catch (err) {
        console.error("[ValidatorMap] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchValidators();
  }, [websiteId]);

  // ── WebSocket connection to Hub for live updates ───────────────────────────
  useEffect(() => {
    const HUB_WS_URL =
      import.meta.env.VITE_HUB_WS_URL || "ws://localhost:8081";

    const connect = () => {
      const ws = new WebSocket(HUB_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Identify this connection as a dashboard client
        ws.send(JSON.stringify({ type: "dashboard-connect" }));
        setWsConnected(true);
        console.log("[ValidatorMap] Connected to Hub WS");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "validator-status-update") {
            const { validatorId, websiteId: updatedWebsiteId, status, latency, timestamp } =
              msg.data;

            // Only process events relevant to this website page
            if (updatedWebsiteId !== websiteId) return;

            setValidators((prev) =>
              prev.map((v) =>
                v.validatorId === validatorId
                  ? {
                      ...v,
                      latestStatus: status,
                      latency: latency ?? v.latency,
                      lastChecked: timestamp ?? v.lastChecked,
                    }
                  : v
              )
            );
          }
        } catch (err) {
          console.error("[ValidatorMap] WS parse error:", err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log("[ValidatorMap] Hub WS closed, reconnecting in 3s...");
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("[ValidatorMap] WS error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [websiteId]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const upCount = validators.filter((v) => v.latestStatus === "Good").length;
  const downCount = validators.filter((v) => v.latestStatus === "Bad").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-700/70 bg-gray-800/30 backdrop-blur-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              🌐
            </span>
            Validator Network Map
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Live status of all validators monitoring{" "}
            <span className="text-gray-200 font-medium">
              {websiteName || websiteUrl || "this site"}
            </span>
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-400">
              {upCount} UP
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-rose-400">
              {downCount} DOWN
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              wsConnected
                ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                : "bg-gray-700/50 border border-gray-600/30 text-gray-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected ? "bg-indigo-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            {wsConnected ? "Live" : "Reconnecting..."}
          </div>
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="h-96 flex items-center justify-center bg-gray-900/40">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Loading validator locations…</p>
          </div>
        </div>
      ) : validators.length === 0 ? (
        <div className="h-96 flex items-center justify-center bg-gray-900/40">
          <div className="text-center">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-gray-400 text-sm">
              No validators with location data have checked this site yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[480px] relative">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%", background: "#0f172a" }}
            className="z-0"
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            />
            <FitBounds validators={validators} />

            {validators.map((validator) => {
              const color = getMarkerColor(validator.latestStatus);
              return (
                <CircleMarker
                  key={validator.validatorId}
                  center={[validator.latitude, validator.longitude]}
                  radius={10}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                    opacity: 1,
                  }}
                >
                  <Popup
                    className="leaflet-popup-dark"
                    closeButton={false}
                  >
                    <div
                      style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        minWidth: "180px",
                        color: "#e2e8f0",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          marginBottom: "6px",
                        }}
                      >
                        {validator.name}
                      </div>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          background:
                            validator.latestStatus === "Good"
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            validator.latestStatus === "Good"
                              ? "#4ade80"
                              : "#f87171",
                          fontSize: "11px",
                          fontWeight: 600,
                          marginBottom: "8px",
                        }}
                      >
                        {statusLabel(validator.latestStatus)}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginBottom: "2px",
                        }}
                      >
                        📍 {validator.location}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "2px" }}>
                        ⚡ {validator.latency} ms
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "2px" }}>
                        🛡️ Trust: {validator.trustScore}/100
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                        {new Date(validator.lastChecked).toLocaleTimeString()}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              zIndex: 999,
              background: "rgba(15,23,42,0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(51,65,85,0.7)",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6, fontWeight: 600 }}>
              LEGEND
            </p>
            {[
              { color: "#22c55e", label: "UP — Site reachable" },
              { color: "#ef4444", label: "DOWN — Site unreachable" },
              { color: "#eab308", label: "Warning" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidatorMap;
