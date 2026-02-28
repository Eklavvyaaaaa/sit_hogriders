import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';
import api from '../services/api';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const { socket, isConnected } = useContext(SocketContext);
    const { user } = useContext(AuthContext);
    const [messagesByExam, setMessagesByExam] = useState({});
    const [unreadCountByExam, setUnreadCountByExam] = useState({});

    // Retrieve full chat history from the backend on initial load or explicit request
    const fetchChatHistory = useCallback(async (examId) => {
        if (!examId) return;
        try {
            const res = await api.get(`/chat/${examId}`);
            if (Array.isArray(res.data)) {
                // Remove duplicates in case of repeated fetches
                const uniqueMsgs = res.data.reduce((acc, current) => {
                    const x = acc.find(item => item.id === current.id || item.tempId === current.tempId);
                    if (!x) {
                        return acc.concat([current]);
                    } else {
                        return acc;
                    }
                }, []);

                setMessagesByExam(prev => ({ ...prev, [examId]: uniqueMsgs }));
            }
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        }
    }, []);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleReceiveMessage = (newMsg) => {
            const examId = newMsg.exam_id;

            // Avoid duplicates by tempId or id
            setMessagesByExam(prev => {
                const currentExamMsgs = prev[examId] || [];
                const isDuplicate = currentExamMsgs.some(m =>
                    m.id === newMsg.id ||
                    (m.tempId && newMsg.tempId && m.tempId === newMsg.tempId)
                );

                if (isDuplicate) return prev;
                return {
                    ...prev,
                    [examId]: [...currentExamMsgs, newMsg]
                };
            });

            // If the message is not from the current user, increment unread count globally
            if (String(newMsg.sender_id) !== String(user?.id)) {
                setUnreadCountByExam(prev => ({
                    ...prev,
                    [examId]: (prev[examId] || 0) + 1
                }));
            }
        };

        // Listen for all incoming chat messages
        socket.on('receive:message', handleReceiveMessage);

        // Required cleanup to prevent duplicate listeners across React StrictMode or remounts
        return () => {
            socket.off('receive:message', handleReceiveMessage);
        };
    }, [socket, isConnected, user?.id]);

    const joinChatRoom = useCallback((examId) => {
        if (socket && isConnected) {
            socket.emit('join:chat', examId, (response) => {
                if (response?.error) console.error("Failed to join chat room:", response.error);
                else console.log(`[ChatContext] Joined global chat room for exam ${examId}`);
            });
        }
    }, [socket, isConnected]);

    const clearUnreadCount = useCallback((examId) => {
        setUnreadCountByExam(prev => ({ ...prev, [examId]: 0 }));
    }, []);

    const sendMessage = useCallback((examId, text) => {
        if (!socket || !isConnected) {
            console.error("Socket not connected. Cannot send message.");
            return false;
        }

        const tempId = Date.now().toString();
        const optimisticMsg = {
            id: tempId,
            tempId,
            exam_id: parseInt(examId, 10),
            sender_id: user.id,
            sender_name: user.name,
            sender_role: user.role,
            message: text,
            timestamp: new Date().toISOString()
        };

        // Optimistically add to UI immediately
        setMessagesByExam(prev => ({
            ...prev,
            [examId]: [...(prev[examId] || []), optimisticMsg]
        }));

        // Send over persistent socket
        socket.emit('send:message', { examId, message: text, tempId }, (response) => {
            if (response?.error) {
                console.error("Transmission failed:", response.error);
                // Rollback optimistic message if failed
                setMessagesByExam(prev => ({
                    ...prev,
                    [examId]: (prev[examId] || []).filter(m => m.tempId !== tempId)
                }));
            }
        });

        return true;
    }, [socket, isConnected, user]);

    return (
        <ChatContext.Provider value={{
            messagesByExam,
            unreadCountByExam,
            fetchChatHistory,
            joinChatRoom,
            clearUnreadCount,
            sendMessage
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    return useContext(ChatContext);
};
