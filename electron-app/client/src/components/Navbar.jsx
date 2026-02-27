import React, { useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Bell, User, Shield, History, Home } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white text-slate-800 px-8 py-4 flex justify-between items-center shadow-sm border-b border-slate-100 sticky top-0 z-50">
            <div className="flex items-center space-x-8">
                <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => navigate(user?.role === 'teacher' ? '/teacher' : '/join')}
                >
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Shield size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">ATI Secure</span>
                </div>

                {user && (
                    <div className="hidden lg:flex items-center space-x-1 text-sm font-bold uppercase tracking-wider">
                        {user.role === 'teacher' ? (
                            <Link
                                to="/teacher"
                                className={`px-4 py-2 rounded-xl transition-all ${location.pathname === '/teacher' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    to="/join"
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/join' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Home size={16} />
                                    <span>Join Exam</span>
                                </Link>
                                <Link
                                    to="/history"
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/history' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <History size={16} />
                                    <span>History</span>
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {user && (
                <div className="flex items-center space-x-6">
                    <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>

                    <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-slate-900 leading-none">{user.name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1.5">{user.role}</p>
                        </div>
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 overflow-hidden border border-slate-200">
                            <User size={20} />
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
