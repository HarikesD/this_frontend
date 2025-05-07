import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonitoringDashboard() {
  const [flowEvents, setFlowEvents] = useState([]);
  const [metrics, setMetrics] = useState({ valence: [], latency: [] });
  const socketRef = useRef(null);
  const base_url = 'http://localhost:3000';

  useEffect(() => {
    const socket = io('http://localhost:3000/dashboard', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Dashboard socket connected:', socket.id);
    });

    socket.on('dashboard_event', event => {
      setFlowEvents(prev => [event, ...prev]);
      setMetrics(prev => ({
        valence: [...prev.valence, { time: new Date().toLocaleTimeString(), value: event.valence }],
        latency: [...prev.latency, { time: new Date().toLocaleTimeString(), value: event.latency }],
      }));
    });

    socket.on('disconnect', () => {
      console.log('Dashboard socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Flow Overview */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Realtime Processing Flow</h2>
        <div className="h-64 overflow-y-auto border rounded p-2">
          <ul className="space-y-2">
            {flowEvents.map((evt, idx) => (
              <li key={idx} className="flex justify-between items-center border-b pb-1">
                <span className="text-gray-800">{evt.step}</span>
                <span
                  className={`${evt.status === 'success' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    } px-2 py-0.5 rounded-full text-xs font-medium`}
                >
                  {evt.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Metrics Charts */}
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
          <h3 className="text-lg font-medium mb-2">Response Latency (ms)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.latency}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" dot={false} stroke="#10B981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
