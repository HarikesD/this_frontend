
import React, { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const formatTime = (ms) => {
  const date = new Date(ms);
  return date.toLocaleTimeString();
};

export default function MonitoringDashboard() {
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState({
    valence: [],
    latency: [],
    confidence: [],
    grpc_latency: [],
    rest_latency: [],
  });
  const [activeConfKey, setActiveConfKey] = useState("growth_challenge");
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:3000/dashboard", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("dashboard_event", (event) => {
      const now = Date.now();
      const timeLabel = new Date(now).toLocaleTimeString();

      setEvents((prev) => [...prev, { ...event, time: timeLabel }]);

      setMetrics((prev) => ({
        valence: [...prev.valence, { time: timeLabel, value: event.valence }],
        latency: [...prev.latency, { time: timeLabel, value: event.latency }],
        confidence: [
          ...prev.confidence,
          {
            time: timeLabel,
            timestamp: now,
            growth_challenge: event.confidence?.growth_challenge,
            reflection_agent: event.confidence?.reflection_agent,
            wisdom_capture: event.confidence?.wisdom_capture,
          },
        ],
        grpc_latency: [
          ...prev.grpc_latency,
          { time: timeLabel, value: event.grpc_latency ?? Math.random() * 100 },
        ],
        rest_latency: [
          ...prev.rest_latency,
          { time: timeLabel, value: event.rest_latency ?? Math.random() * 150 },
        ],
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const data = metrics.confidence;
    if (data.length < 2) return;
    const first = data[0];
    const last = data[data.length - 1];
    const deltas = {
      growth_challenge: (last.growth_challenge || 0) - (first.growth_challenge || 0),
      reflection_agent: (last.reflection_agent || 0) - (first.reflection_agent || 0),
      wisdom_capture: (last.wisdom_capture || 0) - (first.wisdom_capture || 0),
    };
    const ups = Object.keys(deltas).filter((k) => deltas[k] > 0);
    if (ups.length === 0) return;
    const best = ups.reduce((a, b) => (deltas[a] > deltas[b] ? a : b));
    setActiveConfKey(best);
  }, [metrics.confidence]);

  const confTicks = useMemo(() => {
    const data = metrics.confidence;
    if (!data.length) return [];
    const start = data[0].timestamp;
    const end = data[data.length - 1].timestamp;
    const ticks = [];
    for (let t = start; t <= end; t += 15000) {
      ticks.push(t);
    }
    return ticks;
  }, [metrics.confidence]);

  return (
    <div className="p-6 space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-2">Realtime Processing Messages</h2>
        <div className="overflow-auto border rounded max-h-[300px]">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Step</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2">{evt.time}</td>
                  <td className="px-4 py-2">{evt.step}</td>
                  <td className="px-4 py-2">{evt.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="text-lg font-medium mb-2">Valence Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.valence}>
              <XAxis dataKey="time" />
              <YAxis domain={[-1, 1]} />
              <Tooltip />
              <Line type="monotone" dataKey="value" dot={false} stroke="#4F46E5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border rounded p-4">
          <h3 className="text-lg font-medium mb-2">
            {`Confidence Trend: ${activeConfKey.replace("_", " ")}`}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.confidence}>
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={confTicks}
                tickFormatter={formatTime}
              />
              <YAxis domain={[0, 1]} />
              <Tooltip labelFormatter={formatTime} />
              <Line
                type="monotone"
                dataKey={activeConfKey}
                dot={false}
                stroke="#EF4444"
                name={activeConfKey.replace("_", " ")}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border rounded p-4 mt-8">
        <h3 className="text-lg font-medium mb-2">REST vs gRPC Latency</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={metrics.grpc_latency.map((item, i) => ({
            time: item.time,
            grpc: item.value,
            rest: metrics.rest_latency?.[i]?.value || 0,
          }))}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="grpc" stroke="#10B981" name="gRPC Latency" dot={false} />
            <Line type="monotone" dataKey="rest" stroke="#EF4444" name="REST Latency" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
