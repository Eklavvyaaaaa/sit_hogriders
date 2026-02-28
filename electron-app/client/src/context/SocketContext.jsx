import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only establish a socket connection if the user is authenticated.
        const token = Cookies.get('token');
        if (!user || !token) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Initialize the global Socket.io client instance
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
            auth: { token },
            reconnection: true,             // Enable auto-reconnection
            reconnectionAttempts: Infinity, // Keep trying
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        newSocket.on('connect', () => {
            console.log(`[SocketContext] Connected: ${newSocket.id}`);
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`[SocketContext] Disconnected: ${reason}`);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error(`[SocketContext] Connection error:`, error.message);
            setIsConnected(false);
        });

        // Save the socket instance globally
        setSocket(newSocket);

        // Cleanup on unmount or user logout
        return () => {
            newSocket.disconnect();
            setSocket(null);
            setIsConnected(false);
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
