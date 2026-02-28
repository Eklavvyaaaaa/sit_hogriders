import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Bell, User, Shield, History, Home, Sun, Moon, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const notifRef = useRef(null);

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); // Poll every minute
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n =>
                (id === 'all' || n.id === id) ? { ...n, is_read: true } : n
            ));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isDark = theme === 'dark';
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <nav style={{ backgroundColor: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}
            className="px-8 py-3 flex justify-between items-center sticky top-0 z-50">
            <div className="flex items-center space-x-8">
                <Link
                    to={user?.role === 'teacher' ? '/teacher' : '/join'}
                    className="flex items-center space-x-2.5"
                >
                    <div style={{ backgroundColor: 'var(--accent-color)' }} className="p-1.5 rounded-lg text-white">
                        <Shield size={18} />
                    </div>
                    <span style={{ color: 'var(--nav-text)' }} className="text-lg font-semibold tracking-tight">ATI Secure</span>
                </Link>

                {user && (
                    <div className="hidden lg:flex items-center space-x-1 text-sm font-semibold">
                        {user.role === 'teacher' ? (
                            <Link
                                to="/teacher"
                                style={{ color: location.pathname === '/teacher' ? 'var(--accent-color)' : 'var(--nav-text-muted)' }}
                                className={`px-4 py-2 rounded-lg transition-all hover:opacity-80 ${location.pathname === '/teacher' ? 'bg-white/10' : ''}`}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center space-x-1">
                                <Link
                                    to="/join"
                                    style={{ color: location.pathname === '/join' ? 'var(--accent-color)' : 'var(--nav-text-muted)' }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:opacity-80 ${location.pathname === '/join' ? 'bg-white/10' : ''}`}
                                >
                                    <Home size={15} />
                                    <span>Join Exam</span>
                                </Link>
                                <Link
                                    to="/history"
                                    style={{ color: location.pathname === '/history' ? 'var(--accent-color)' : 'var(--nav-text-muted)' }}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:opacity-80 ${location.pathname === '/history' ? 'bg-white/10' : ''}`}
                                >
                                    <History size={15} />
                                    <span>History</span>
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {user && (
                <div className="flex items-center space-x-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        style={{ color: 'var(--nav-text-muted)' }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Toggle theme"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            aria-label="Notifications"
                            style={{ color: 'var(--nav-text-muted)' }}
                            className="relative hover:opacity-80 transition-colors mt-1"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 text-[8px] flex items-center justify-center font-bold text-white bg-red-500 rounded-full">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} className="absolute right-0 mt-3 w-80 rounded-xl shadow-lg border overflow-hidden z-50 flex flex-col max-h-[85vh]">
                                <div style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }} className="px-4 py-3 border-b flex justify-between items-center shrink-0">
                                    <h3 className="font-bold text-sm">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button onClick={() => handleMarkAsRead('all')} style={{ color: 'var(--accent-color)' }} className="text-[10px] uppercase tracking-wider font-bold hover:opacity-80 transition-opacity">
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {notifications.length === 0 ? (
                                        <div style={{ color: 'var(--text-muted)' }} className="p-4 text-center text-xs font-medium">No notifications yet.</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    if (!n.is_read) handleMarkAsRead(n.id);
                                                    if (n.action_url) navigate(n.action_url);
                                                    setShowNotifications(false);
                                                }}
                                                style={{ backgroundColor: n.is_read ? 'transparent' : 'var(--accent-light)' }}
                                                className="p-3 rounded-lg cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex gap-3"
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    {n.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-blue-500" />}
                                                </div>
                                                <div>
                                                    <p className={`text-xs ${n.is_read ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                                                    <p style={{ color: 'var(--text-secondary)' }} className="text-[11px] mt-0.5 leading-snug">{n.message}</p>
                                                    <p style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-wider mt-1 font-bold">
                                                        {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ borderLeft: '1px solid var(--nav-border)' }} className="flex items-center space-x-3 pl-4">
                        <div className="text-right hidden sm:block">
                            <p style={{ color: 'var(--nav-text)' }} className="text-sm font-semibold leading-none">{user.name}</p>
                            <p style={{ color: 'var(--nav-text-muted)' }} className="text-[10px] uppercase tracking-wider font-medium mt-1">{user.role}</p>
                        </div>
                        <div style={{ backgroundColor: 'var(--nav-border)' }} className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <User size={16} style={{ color: 'var(--nav-text-muted)' }} />
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{ color: 'var(--nav-text-muted)' }}
                            className="hover:text-red-400 transition-colors ml-1"
                            aria-label="Logout"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
