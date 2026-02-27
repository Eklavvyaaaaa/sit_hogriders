import React, { useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Bell, User, History, LayoutDashboard, BookOpen } from 'lucide-react';
import logo from '../assets/logo.svg';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isStudent = user?.role === 'student';

    return (
        <nav className="bg-white text-slate-800 px-8 py-3 flex justify-between items-center shadow-sm border-b border-slate-100 sticky top-0 z-50">
            {/* Left: Brand */}
            <div className="flex items-center">
                <Link
                    to={user?.role === 'teacher' ? '/teacher' : '/dashboard'}
                    className="flex items-center space-x-3 group"
                >
                    <img
                        src={logo}
                        alt="ATI Secure Logo"
                        className="w-10 h-10 object-contain animate-antigravity"
                    />
                    <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">ATI Secure</span>
                </Link>
            </div>

            {/* Center: Navigation (for students) */}
            {isStudent && (
                <div className="hidden lg:flex items-center bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-100">
                    <Link
                        to="/dashboard"
                        className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold tracking-tight transition-all ${location.pathname === '/dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <LayoutDashboard size={16} />
                        <span>Dashboard</span>
                    </Link>
                    <Link
                        to="/join"
                        className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold tracking-tight transition-all ${location.pathname === '/join' || location.pathname === '/exam' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <BookOpen size={16} />
                        <span>My Exams</span>
                    </Link>
                    <Link
                        to="/history"
                        className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold tracking-tight transition-all ${location.pathname.startsWith('/history') || location.pathname.startsWith('/results') || location.pathname.startsWith('/review')
                                ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <History size={16} />
                        <span>History</span>
                    </Link>
                </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center space-x-6">
                {user && (
                    <>
                        <button
                            aria-label="Notifications"
                            className="bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all relative border border-slate-100"
                        >
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center space-x-4 pl-6 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1.5">{user.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 overflow-hidden border border-blue-100 group cursor-pointer hover:border-blue-400 transition-all shadow-inner">
                                <User size={22} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-slate-50 p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-100"
                                aria-label="Logout"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
