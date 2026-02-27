import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [error, setError] = useState('');
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleToggle = () => setIsRegister(!isRegister);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                await register(formData.name, formData.email, formData.password, formData.role);
                setIsRegister(false); // Switch to login after successful register
                alert('Registration successful! Please login.');
            } else {
                const user = await login(formData.email, formData.password);
                navigate(user.role === 'teacher' ? '/teacher' : '/join');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 flex-col relative overflow-hidden">
            {/* Decals background */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full point-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full point-events-none"></div>

            <div className="mb-8 flex flex-col items-center">
                <div className="p-4 bg-slate-800 rounded-2xl shadow-xl shadow-slate-900/50 mb-4 border border-slate-700/50 relative">
                    <div className="absolute inset-0 border border-blue-500/30 rounded-2xl animate-pulse"></div>
                    <ShieldAlert size={48} className="text-blue-500" />
                </div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">SecureExam Pro</h1>
                <p className="text-slate-400 mt-2 font-medium">AI-Powered Exam Monitoring</p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50 relative z-10">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>

                {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-center text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="block text-slate-400 text-sm font-semibold mb-2">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-slate-500"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-slate-400 text-sm font-semibold mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-slate-500"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm font-semibold mb-2">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-slate-500"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {isRegister && (
                        <div>
                            <label className="block text-slate-400 text-sm font-semibold mb-2">Role</label>
                            <select
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98]"
                    >
                        {isRegister ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <p className="mt-6 text-center text-slate-400 text-sm">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button onClick={handleToggle} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                        {isRegister ? 'Login' : 'Register'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
