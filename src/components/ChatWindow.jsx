import { useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let storedId = sessionStorage.getItem('user_id');

      // 🔐 If no user, register first
      if (!storedId) {
        const randomEmail = `user-${uuidv4()}@gmail.com`;
        const signupRes = await axios.post('http://localhost:3000/api/v1/auth/signup', {
          email: randomEmail,
          password: 'Vikram@gmail#',
        });

        console.log(signupRes.data,"response of signup")

        storedId = signupRes.data.user.id;
        sessionStorage.setItem('user_id', storedId);
        setUserId(storedId);
      }

      // 🧠 Send message to backend
      const res = await axios.post('http://localhost:3000/api/v1/message', {
        userId: userId || storedId,
        message: input,
      });

      console.log(res,"response of message after signup")

      const systemMsg = {
        role: 'system',
        content: res.data.question ? res.data.question : (res.data.message ?res.data.message : `let us go for ${res.data.route_to }` ),
        agent: res.data.status ==="completed"? res.data.route_to : res.data.routed_to,
        mental_model: res.data.mental_model || '',
      };

      setMessages((prev) => [...prev, systemMsg]);
    } catch (error) {
      console.error('Message error:', error.message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: '❌ Failed to contact backend.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
      <div className="h-[400px] overflow-y-auto mb-4 border p-3 rounded space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded max-w-[80%] ${
              msg.role === 'user' ? 'ml-auto bg-blue-100 text-right' : 'bg-gray-100'
            }`}
          >
            <div>
              <strong>{msg.role === 'user' ? 'You' : 'System'}:</strong> {msg.content}
            </div>
            {msg.agent && (
              <div className="text-xs text-gray-500 mt-1 italic">
                🧭 Routed to: {msg.agent}
                {msg.mental_model ? ` | 🧠 Model: ${msg.mental_model}` : ''}
              </div>
            )}
          </div>
        ))}
        {isTyping && <div className="text-xs italic text-gray-400">System is typing...</div>}
      </div>

      <div className="flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-grow border border-gray-300 px-3 py-2 rounded-l"
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-r">
          Send
        </button>
      </div>
    </div>
  );
}
