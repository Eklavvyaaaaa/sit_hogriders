import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Bell, User, Shield } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white text-slate-800 px-8 py-4 flex justify-between items-center shadow-sm border-b border-slate-100 sticky top-0 z-50">
            <div className="flex items-center space-x-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                    <Shield size={20} />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">ATI Secure</span>
            </div>

            {user && (
                <>
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
                        <Link to="/join" className="hover:text-blue-600 transition-colors">Dashboard</Link>
                        <Link to="#" className="hover:text-blue-600 transition-colors">My Exams</Link>
                        <Link to="#" className="hover:text-blue-600 transition-colors">Results</Link>
                    </div>

                    <div className="flex items-center space-x-6">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="flex items-center space-x-3 pl-6 border-l border-slate-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-900 leading-none">{user.name}</p>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{user.role}</p>
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
                </>
            )}
        </nav>
    );
};

export default Navbar;
