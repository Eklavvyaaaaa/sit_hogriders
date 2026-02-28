import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { MessageSquare, Send, X } from 'lucide-react';

const ChatBox = ({ examId }) => {
    const { user } = useContext(AuthContext);
    const {
        messagesByExam,
        unreadCountByExam,
        fetchChatHistory,
        joinChatRoom,
        clearUnreadCount,
        sendMessage
    } = useChat();

    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const messages = messagesByExam[examId] || [];
    const unreadCount = unreadCountByExam[examId] || 0;

    // Join room and fetch history on mount
    useEffect(() => {
        if (!examId) return;
        joinChatRoom(examId);
        if (messages.length === 0) {
            fetchChatHistory(examId);
        }
    }, [examId, joinChatRoom, fetchChatHistory]);

    // Scroll to bottom when new messages arrive or when opening
    useEffect(() => {
        if (isOpen) {
            clearUnreadCount(examId);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, examId, clearUnreadCount]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const success = sendMessage(examId, newMessage.trim().slice(0, 2000));
        if (success) {
            setNewMessage('');
            // Scroll to bottom immediately upon sending
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
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
                                const isMine = String(msg.sender_id) === String(user.id);
                                return (
                                    <div key={msg.id || msg.tempId || `opt-${idx}`} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-400 mb-1 px-1 font-bold uppercase tracking-wider">
                                            {isMine ? 'You' : `${msg.sender_name} (${msg.sender_role})`}
                                        </span>
                                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${isMine
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : msg.sender_role === 'teacher'
                                                ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                                            } ${msg.tempId ? 'opacity-70' : ''}`}>
                                            <p className="text-sm leading-relaxed">{msg.message || msg.message_text}</p>
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
