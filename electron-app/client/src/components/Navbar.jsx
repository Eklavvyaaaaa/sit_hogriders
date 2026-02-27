import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, User, History, Home } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg border-b border-slate-700">
            <div className="flex items-center space-x-6">
                <div className="text-xl font-bold tracking-wider text-blue-400 cursor-pointer" onClick={() => navigate(user?.role === 'teacher' ? '/teacher' : '/join')}>
                    SecureExam Pro
                </div>

                {user && (
                    <div className="flex items-center space-x-1">
                        {user.role === 'teacher' ? (
                            <button
                                onClick={() => navigate('/teacher')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/teacher' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/join')}
                                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/join' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <Home size={14} />
                                    <span>Join</span>
                                </button>
                                <button
                                    onClick={() => navigate('/history')}
                                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/history' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <History size={14} />
                                    <span>History</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {user && (
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 text-slate-300">
                        <User size={18} />
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400 uppercase tracking-wide">
                            {user.role}
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
