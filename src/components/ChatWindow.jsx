import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { io } from 'socket.io-client';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function ChatWindow({ onNewBatch }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [valenceHistory, setValenceHistory] = useState([]);

  const base_url = 'http://localhost:3000';

  useEffect(() => {
    const newSocket = io(base_url, { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    // ----- ONE-SHOT replies -----
    newSocket.on('agent_response', async (data) => {
      console.log('Agent Response:', data);
      const systemMsg = {
        role: 'system',
        content: data.message,
        agent: data.agent,
        mental_model: data.mental_model || '',
      };
      setMessages((prev) => [...prev, systemMsg]);
      setIsTyping(false);

      const storedId = sessionStorage.getItem('user_id') || data.user_id;
      try {
        const res = await axios.get(`${base_url}/api/v1/valence/history`, {
          params: { userId: storedId, limit: 3 },
        });
        setValenceHistory(res.data.history);
      } catch (err) {
        console.error('Failed to fetch valence history:', err);
      }
    });

    // ----- STREAMING replies -----
    let isFirstChunk = true;
    newSocket.on('agent_stream', (chunk) => {
      console.log('Agent chunk:', chunk);
      setMessages((prev) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          return [
            ...prev,
            {
              role: 'system',
              content: chunk.message,
              agent: chunk.agent,
              mental_model: chunk.mental_model || '',
            },
          ];
        }
        // append to last system message
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = {
          ...last,
          content: last.content + chunk.message,
        };
        return updated;
      });
    });

    newSocket.on('agent_stream_complete', () => {
      console.log('Agent stream complete');
      setIsTyping(false);
      const storedId = sessionStorage.getItem('user_id');
      axios
        .get(`${base_url}/api/v1/valence/history`, {
          params: { userId: storedId, limit: 3 },
        })
        .then((res) => setValenceHistory(res.data.history))
        .catch((err) =>
          console.error('Failed to fetch valence history after stream:', err)
        );
    });

    newSocket.on('agent_stream_error', (err) => {
      console.error('Stream error:', err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: '❌ Stream failed. Please try again.',
        },
      ]);
    });

    // ----- generic socket error -----
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: '❌ Failed to process your message. Please try again.',
        },
      ]);
      setIsTyping(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let storedId = sessionStorage.getItem('user_id');

      // If no user, register first
      if (!storedId) {
        const randomEmail = `user-${uuidv4()}@gmail.com`;
        const signupRes = await axios.post(`${base_url}/api/v1/auth/signup`, {
          email: randomEmail,
          password: 'Vikram@gmail#',
        });
        storedId = signupRes.data.user.id;
        sessionStorage.setItem('user_id', storedId);
        setUserId(storedId);
      }

      const finalUserId = userId || storedId;
      socket?.emit('user_message', { userId: finalUserId, message: input });

      // Trigger new batch on dashboard
      onNewBatch();
    } catch (error) {
      console.error('Message error:', error.message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: '❌ Failed to register or send message.',
        },
      ]);
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
      {/* Valence sparkline */}
      {valenceHistory?.length > 1 && (
        <div className="mb-4 p-2 border rounded">
          <h4 className="text-xs text-gray-600 mb-1">Recent Mood</h4>
          <ResponsiveContainer width="100%" height={50}>
            <LineChart
              data={valenceHistory.map((v, i) => ({ index: i, value: v }))}
            >
              <Line type="monotone" dataKey="value" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="h-[400px] overflow-y-auto mb-4 border p-3 rounded space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded max-w-[80%] ${
              msg.role === 'user'
                ? 'ml-auto bg-blue-100 text-right'
                : 'bg-gray-100'
            }`}
          >
            <div>
              <strong>{msg.role === 'user' ? 'You' : 'System'}:</strong>{' '}
              {msg.content}
            </div>
            {msg.agent && (
              <div className="text-xs text-gray-500 mt-1 italic">
                🧭 Routed to: {msg.agent}
                {msg.mental_model ? ` | 🧠 Model: ${msg.mental_model}` : ''}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="text-xs italic text-gray-400">
            System is thinking...
          </div>
        )}
      </div>

      <div className="flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-grow border border-gray-300 px-3 py-2 rounded-l"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}
