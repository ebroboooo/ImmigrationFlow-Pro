import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { seedDemoData, seedFreshData } from '../../../infrastructure/seeders/DemoSeeder';
import { ADMIN_EMAIL, APP_NAME, STORAGE_KEYS } from '../../../lib/constants';
import { Rocket, Database, Play, Loader2, Scale } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const WelcomeScreen = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleStartDemo = async () => {
    setLoading(true);
    await seedDemoData();
    localStorage.setItem(STORAGE_KEYS.setupComplete, 'true');
    await login(ADMIN_EMAIL);
    navigate('/');
  };

  const handleCreateNew = async () => {
    setLoading(true);
    await seedFreshData();
    localStorage.setItem(STORAGE_KEYS.setupComplete, 'true');
    await login(ADMIN_EMAIL);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/20 blur-[120px]" />

      <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-700 ease-out">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 mb-6">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{APP_NAME}</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Professional immigration case management for U.S. law firms. Choose demo mode to explore a fully populated firm, or start fresh with guided setup.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto">
          <button
            onClick={handleStartDemo}
            disabled={loading}
            className={cn(
              "text-left group relative glass-card p-8 transition-all duration-300",
              "hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-indigo-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="h-12 w-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Play className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Demo Mode</h3>
            <p className="text-gray-400 mb-6">
              Explore Smith & Associates Immigration Law with 100 clients, 95 cases, 12 attorneys, 18 paralegals, 400 documents, and 60 appointments.
            </p>
            <div className="flex items-center text-indigo-400 font-medium">
              Launch Portfolio Demo <Rocket className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={handleCreateNew}
            disabled={loading}
            className={cn(
              "text-left group relative glass-card p-8 transition-all duration-300",
              "hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 hover:border-cyan-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="h-12 w-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Fresh Start</h3>
            <p className="text-gray-400 mb-6">
              Start with a clean workspace. Set up your firm profile, add your team, and begin managing real immigration cases from day one.
            </p>
            <div className="flex items-center text-cyan-400 font-medium">
              Create New Firm <Rocket className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-white font-medium">Setting up your workspace...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
