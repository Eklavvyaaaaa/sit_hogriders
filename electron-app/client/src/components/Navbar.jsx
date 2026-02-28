import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Bell, User, Shield, History, Home, Sun, Moon } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isDark = theme === 'dark';

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

                    <button
                        aria-label="Notifications"
                        style={{ color: 'var(--nav-text-muted)' }}
                        className="relative hover:opacity-80 transition-colors"
                    >
                        <Bell size={18} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

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
