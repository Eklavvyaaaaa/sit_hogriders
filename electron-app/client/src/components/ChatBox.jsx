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
            // Deduplicate: the sender already adds the message from HTTP response
            setMessages(prev => {
                if (msg.id && prev.some(m => m.id === msg.id)) return prev;
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

        setIsSending(true);
        try {
            const res = await api.post('/chat', {
                examId,
                message: newMessage
            });

            const newMsg = res.data;
            // Add locally for instant feedback (server broadcast will be deduped)
            setMessages(prev => {
                if (newMsg.id && prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send message', err);
        } finally {
            setIsSending(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl relative transition-transform hover:scale-105"
                >
                    <MessageSquare size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            {isOpen && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col h-[500px] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center text-white">
                        <div className="flex items-center space-x-2">
                            <MessageSquare size={20} className="text-blue-400" />
                            <h3 className="font-bold tracking-tight">Live Support</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/50">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                                <MessageSquare size={32} className="opacity-20" />
                                <p className="text-sm">No messages yet. Say hi!</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMine = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id || idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-500 mb-1 px-1 font-semibold uppercase tracking-wider">
                                            {isMine ? 'You' : `${msg.sender_name} (${msg.sender_role})`}
                                        </span>
                                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${isMine
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : msg.sender_role === 'teacher'
                                                ? 'bg-slate-700 text-slate-100 border border-slate-600 rounded-tl-sm'
                                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                                            }`}>
                                            <p className="text-sm leading-relaxed">{msg.message_text}</p>
<<<<<<< HEAD
                                            <p className={`text-[9px] mt-1 opacity-70 ${isMine ? 'text-right' : 'text-left'}`}>
                                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </p>
=======
>>>>>>> d779e8544c9cb639a7dd66c4f5986c5c8403f16c
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-2 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20"
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
