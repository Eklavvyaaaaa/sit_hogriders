import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

const BadgeAnimation = () => {
    return (
        <div className="relative w-80 h-52 flex flex-col items-center animate-badge">
            {/* Top Loop with Hole */}
            <div className="relative w-16 h-12 bg-blue-600 rounded-t-xl flex justify-center pt-2">
                <div className="w-6 h-6 bg-white rounded-full border-4 border-blue-600"></div>
            </div>

            {/* Main ID Card Body */}
            <div className="w-full h-full bg-white border-[6px] border-blue-600 rounded-2xl shadow-2xl flex overflow-hidden relative">
                <div className="flex w-full h-full pt-10 pb-6 px-8 gap-8">
                    {/* Avatar Section - Matching Reference hair/silhouette */}
                    <div className="w-1/3 flex flex-col items-center">
                        <div className="relative w-full aspect-square bg-blue-50 border-2 border-blue-100 rounded-lg flex items-center justify-center overflow-hidden animate-avatar">
                            <svg viewBox="0 0 100 100" className="w-full h-full p-2 text-blue-400 fill-current">
                                {/* Stylized Hair/Head from reference image */}
                                <path d="M50 20c-15 0-25 10-25 25 0 5 2 10 5 13-3 5-5 10-5 15v10h50v-10c0-5-2-10-5-15 3-3 5-8 5-13 0-15-10-25-25-25z" fill="#3b82f6" />
                                <path d="M50 20c-5 0-15 2-15 15 0 5 2 8 5 10 2-4 5-6 10-6s8 2 10 6c3-2 5-5 5-10 0-13-10-15-15-15z" fill="#2563eb" />
                            </svg>
                        </div>
                    </div>

                    {/* 4 Alternating Text Lines */}
                    <div className="flex-1 flex flex-col justify-center space-y-4">
                        <div className="h-3 bg-blue-600 rounded-sm animate-line-1 w-full"></div>
                        <div className="h-3 bg-blue-400 rounded-sm animate-line-2 w-[90%]"></div>
                        <div className="h-3 bg-blue-600 rounded-sm animate-line-3 w-full"></div>
                        <div className="h-3 bg-blue-400 rounded-sm animate-line-4 w-[80%]"></div>
                    </div>
                </div>

                {/* Bottom Accent */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-blue-600"></div>
            </div>
        </div>
    );
};

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, register } = useContext(AuthContext);
    const navigate = useNavigate();

    // For smooth height transition
    const formRef = useRef(null);
    const [formHeight, setFormHeight] = useState('auto');

    useEffect(() => {
        if (formRef.current) {
            setFormHeight(formRef.current.scrollHeight);
        }
    }, [isRegister, error]);

    const handleToggle = () => setIsRegister(!isRegister);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegister) {
                await register(formData.name, formData.email, formData.password, formData.role);
                setIsRegister(false); // Switch to login after successful register
            } else {
                const user = await login(formData.email, formData.password);
                console.log("Login successful:", user);

                // Also store token in localStorage for direct API calls
                const token = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('token='))
                    ?.split('=')[1];
                if (token) {
                    localStorage.setItem("token", token);
                }
                if (user.role) {
                    localStorage.setItem("role", user.role);
                }

                navigate(user.role === 'teacher' ? '/teacher' : '/join');
            }
        } catch (err) {
            console.error('Authentication attempt failed:', err);
            setError(err.response?.data?.message || err.message || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen flex font-inter overflow-hidden">
            {/* Left Half: Animation & Welcome (White background) */}
            <div className="hidden lg:flex w-1/2 bg-white flex-col relative p-16 justify-center items-center">
                <div className="absolute top-12 left-12 flex items-center space-x-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Shield size={24} />
                    </div>
                    <span className="text-2xl font-black text-slate-900 tracking-tight">ATI Secure</span>
                </div>

                <div className="max-w-md w-full text-center space-y-10">
                    <div className="space-y-4">
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter animate-fade-in">Welcome</h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed">Sign in and let the learning begin!</p>
                    </div>

                    <div className="py-16 flex justify-center">
                        <BadgeAnimation />
                    </div>
                </div>

                <div className="absolute bottom-12 left-12 text-slate-300 text-sm font-bold tracking-widest uppercase">
                    Smart Assessment Technology
                </div>
            </div>

            {/* Right Half: Login Form (Light blue background) */}
            <div className="w-full lg:w-1/2 bg-[#f0f7ff] flex items-center justify-center p-8 relative">
                {/* Mobile Header */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center space-x-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                        <Shield size={20} />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">ATI Secure</span>
                </div>

                {/* Main Card with Smooth Height Transition */}
                <div
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/50 relative overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ height: formHeight !== 'auto' ? `${formHeight + 80}px` : 'auto' }}
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>

                    <div ref={formRef} className="p-12">
                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Sign in</h2>
                        <p className="text-slate-500 text-sm mb-10 font-medium">
                            {isRegister ? 'Already have an account?' : 'New to ATI Secure?'}{' '}
                            <button type="button" onClick={handleToggle} className="text-blue-600 font-bold hover:underline">
                                {isRegister ? 'Sign in here' : 'Create an account'}
                            </button>
                        </p>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-8 text-sm font-bold flex items-center animate-shake">
                                <span className="mr-2 uppercase text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">Error</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {isRegister && (
                                <div className="animate-fade-in">
                                    <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wider text-[11px]">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-700 text-sm font-bold mb-2 uppercase tracking-wider text-[11px]">Email address or username</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-slate-700 text-sm font-bold uppercase tracking-wider text-[11px]">Password</label>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 pr-14 font-medium"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                    </button>
                                </div>
                            </div>

                            {!isRegister && (
                                <button type="button" className="text-blue-600 text-sm font-bold hover:underline mt-2">
                                    Trouble signing in?
                                </button>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-full shadow-xl shadow-blue-200 transition-all active:scale-[0.98] text-lg mt-6"
                            >
                                {isRegister ? 'Create Account' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-12 text-slate-400 text-[11px] text-center leading-relaxed font-semibold">
                            By signing in, you agree to our <button className="text-slate-600 underline">Terms of use</button> and acknowledge our <button className="text-slate-600 underline">Privacy notice</button>.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
