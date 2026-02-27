import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { MessageSquare, Send, X } from 'lucide-react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

const ChatBox = ({ examId }) => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const isOpenRef = useRef(false);

    useEffect(() => {
        if (!examId || !user) return;

        // Fetch initial messages
        const fetchMessages = async () => {
            try {
                const res = await api.get(`/chat/${examId}`);
                setMessages(res.data);
            } catch (err) {
                console.error('Failed to fetch messages', err);
            }
        };
        fetchMessages();

        // Connect to socket with JWT auth
        const token = Cookies.get('token');
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
            auth: { token }
        });
        socketRef.current = socket;

        // Join chat room after connection (handles initial connect + reconnects)
        socket.on('connect', () => {
            socket.emit('join:chat', examId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        socket.on('receive:message', (msg) => {
            setMessages(prev => {
                // Deduplicate by id or by optimistic tempId match
                if (msg.id && prev.some(m => m.id === msg.id)) return prev;
                // Replace the optimistic message (same sender + same text + no id)
                const optimisticIdx = prev.findIndex(m =>
                    !m.id && m.sender_id === msg.sender_id && m.message_text === msg.message_text
                );
                if (optimisticIdx !== -1) {
                    const updated = [...prev];
                    updated[optimisticIdx] = msg; // Replace with server-confirmed version
                    return updated;
                }
                return [...prev, msg];
            });
            if (!isOpenRef.current) {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('receive:message');
            socket.disconnect();
        };
    }, [examId, user]);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) {
            setUnreadCount(0);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        const messageText = newMessage.trim();
        setNewMessage(''); // Clear input immediately

        // Optimistic: show message instantly (no id = optimistic)
        const optimisticMsg = {
            sender_id: user.id,
            sender_name: user.name,
            sender_role: user.role,
            message_text: messageText,
            exam_id: examId,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);

        // Send via WebSocket (much faster than HTTP POST)
        const socket = socketRef.current;
        if (socket && socket.connected) {
            socket.emit('send:message', { examId, message: messageText }, (response) => {
                if (response?.error) {
                    console.error('Socket send failed:', response.error);
                    // Remove optimistic message on failure
                    setMessages(prev => prev.filter(m => m !== optimisticMsg));
                }
                // On success, the receive:message broadcast will replace the optimistic message
            });
        } else {
            // Fallback to HTTP if socket is disconnected
            try {
                const res = await api.post('/chat', { examId, message: messageText });
                // Replace optimistic with server response
                setMessages(prev => {
                    const idx = prev.indexOf(optimisticMsg);
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = res.data;
                        return updated;
                    }
                    return prev;
                });
            } catch (err) {
                console.error('Failed to send message', err);
                setMessages(prev => prev.filter(m => m !== optimisticMsg));
            }
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-xl shadow-blue-600/20 relative transition-transform hover:scale-105"
                >
                    <MessageSquare size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {isOpen && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col h-[500px] overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center space-x-2">
                            <MessageSquare size={20} />
                            <h3 className="font-bold tracking-tight">Live Chat</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors hover:bg-blue-700 p-1 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                                <MessageSquare size={32} className="opacity-20" />
                                <p className="text-sm font-medium">No messages yet. Say hi!</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMine = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id || `opt-${idx}`} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-400 mb-1 px-1 font-bold uppercase tracking-wider">
                                            {isMine ? 'You' : `${msg.sender_name} (${msg.sender_role})`}
                                        </span>
                                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${isMine
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : msg.sender_role === 'teacher'
                                                ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                                            } ${!msg.id && isMine ? 'opacity-70' : ''}`}>
                                            <p className="text-sm leading-relaxed">{msg.message_text}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-50 text-slate-900 rounded-xl px-4 py-2.5 border-2 border-slate-100 focus:border-blue-600 focus:bg-white focus:ring-0 outline-none text-sm transition-all placeholder-slate-400 font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatBox;
