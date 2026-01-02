import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  LayoutDashboard, 
  Globe, 
  Activity, 
  Users, 
  Skull, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  Menu, 
  X, 
  LogOut, 
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Send,
  MessageSquare,
  Settings,
  Bell,
  ArrowUpRight,
  Database,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// --- Constants & Config ---
const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
const API_URL = 'https://disease.sh/v3/covid-19';

// --- Types ---
interface GlobalStats {
  cases: number;
  todayCases: number;
  deaths: number;
  todayDeaths: number;
  recovered: number;
  todayRecovered: number;
  active: number;
  population: number;
  updated: number;
}

interface CountryData {
  country: string;
  countryInfo: { iso2: string; flag: string; };
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  continent: string;
  population: number;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// --- Utilities ---
const formatNumber = (num: number) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
  const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Sub-Components ---
const StatCard = ({ title, value, change, icon: Icon, colorClass }: any) => (
  <div className="glass-panel p-6 rounded-3xl shadow-lg border border-slate-700/30 hover:border-indigo-500/50 transition-all duration-500 group relative overflow-hidden">
    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon size={120} />
    </div>
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`p-3 rounded-2xl ${colorClass} shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
      {change && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {change}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">{title}</h3>
    <div className="flex items-end gap-2 relative z-10">
      <p className="text-3xl font-black text-white tracking-tighter">{formatNumber(value)}</p>
    </div>
  </div>
);

const App = () => {
  // Navigation & UI State
  const [view, setView] = useState<'dashboard' | 'world' | 'trends' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [systemStatus, setSystemStatus] = useState('Stable');
  
  // App Config Settings
  const [config, setConfig] = useState({
    theme: 'Midnight Deep',
    refreshRate: 30,
    aiModel: 'Gemini 3 Flash',
    notifications: true
  });

  // Data State
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [historical, setHistorical] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  // Auth Simulation
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('nexus_auth') || 'null'));

  const addNotification = useCallback((text: string) => {
    if (!config.notifications) return;
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, [config.notifications]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSystemStatus('Syncing');
    try {
      const [gRes, cRes, hRes] = await Promise.all([
        fetch(`${API_URL}/all`),
        fetch(`${API_URL}/countries`),
        fetch(`${API_URL}/historical/all?lastdays=60`)
      ]);
      const gData = await gRes.json();
      const cData = await cRes.json();
      const hData = await hRes.json();
      
      setGlobalStats(gData);
      setCountries(cData);
      setHistorical(hData);
      setSystemStatus('Active');
      addNotification("Quantum Data Link Established.");
    } catch (err) {
      setSystemStatus('Error');
      addNotification("Critical: API Cluster Unresponsive.");
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (config.refreshRate > 0) fetchData();
    }, config.refreshRate * 1000);
    return () => clearInterval(interval);
  }, [fetchData, config.refreshRate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const email = data.get('email') as string;
    const userData = { email, name: email.split('@')[0].toUpperCase(), level: 'L7 COMMANDER' };
    setUser(userData);
    localStorage.setItem('nexus_auth', JSON.stringify(userData));
    addNotification(`Authentication Successful. Welcome ${userData.name}.`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexus_auth');
    addNotification("Session Purged.");
  };

  // --- Premium AI Chatbot Logic ---
  const initChat = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are Nexus Assistant (AX-9), a world-class health intelligence agent. 
        Current Stats: Cases: ${globalStats?.cases}, Active: ${globalStats?.active}, Deaths: ${globalStats?.deaths}.
        Total Countries Managed: ${countries.length}.
        Your persona: Professional, data-driven, futuristic, and helpful. 
        You use professional health terminology. You can analyze trends and provide actionable summaries.`,
      }
    });
    chatSessionRef.current = chat;
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiTyping) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      if (!chatSessionRef.current) await initChat();
      
      const stream = await chatSessionRef.current!.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      setChatMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date(), isStreaming: true }]);

      for await (const chunk of stream) {
        fullText += (chunk as GenerateContentResponse).text || '';
        setChatMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'model') {
            last.text = fullText;
          }
          return updated;
        });
      }
      
      setChatMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'model') last.isStreaming = false;
        return updated;
      });

    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Neural link failed. Attempting reconnection...', timestamp: new Date() }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // --- Views ---
  const DashboardView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {globalStats && (
          <>
            <StatCard title="Confirmed Vectors" value={globalStats.cases} change={`+${formatNumber(globalStats.todayCases)}`} icon={Activity} colorClass="bg-indigo-600" />
            <StatCard title="Restored Vitality" value={globalStats.recovered} change={`+${formatNumber(globalStats.todayRecovered)}`} icon={Users} colorClass="bg-emerald-600" />
            <StatCard title="System Casualties" value={globalStats.deaths} change={`+${formatNumber(globalStats.todayDeaths)}`} icon={Skull} colorClass="bg-rose-600" />
            <StatCard title="Active Strain" value={globalStats.active} icon={Zap} colorClass="bg-amber-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel p-8 rounded-[2.5rem] min-h-[450px] shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-white flex items-center gap-3">
                <TrendingUp className="text-indigo-400" /> Transmission Waveform
              </h3>
              <p className="text-slate-500 text-sm">60-day predictive data modeling</p>
            </div>
            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
              <button className="px-5 py-2 bg-indigo-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20">60D</button>
              <button className="px-5 py-2 text-slate-500 hover:text-white text-xs font-bold transition-all">ALL TIME</button>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historical ? Object.keys(historical.cases).map(date => ({ 
                date, 
                cases: historical.cases[date],
                deaths: historical.deaths[date]
              })) : []}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
                <XAxis dataKey="date" hide />
                <YAxis stroke="#475569" fontSize={10} tickFormatter={formatNumber} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff' }} 
                />
                <Area type="monotone" dataKey="cases" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#chartGradient)" />
                <Area type="monotone" dataKey="deaths" stroke="#f43f5e" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
             <ShieldCheck size={40} className="text-indigo-500/20 group-hover:scale-125 transition-transform duration-700" />
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white">System Integrity</h3>
            <div className="space-y-3">
              {[
                { label: 'Neural Throughput', value: '1.2 GB/s', color: 'text-emerald-400' },
                { label: 'Data Latency', value: '12ms', color: 'text-indigo-400' },
                { label: 'Secure Encryption', value: 'AES-256', color: 'text-emerald-400' },
                { label: 'Cloud Synchrony', value: 'Perfect', color: 'text-indigo-400' },
              ].map((stat, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</span>
                  <span className={`text-sm font-black ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
          <button 
            onClick={() => addNotification("Diagnostic Sequence Initiated...")}
            className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <Cpu size={20} /> RUN FULL SCAN
          </button>
        </div>
      </div>
    </div>
  );

  const WorldView = () => (
    <div className="glass-panel rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 shadow-2xl">
      <div className="p-8 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-900/20">
        <div>
          <h2 className="text-3xl font-black text-white">Registry Center</h2>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Global Bio-Data Streams</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Filter by Territory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-inner"
            />
          </div>
          <button 
            onClick={() => exportToCSV(countries, 'nexus_full_registry')}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg transition-all active:scale-90"
          >
            <Download size={22} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/50 text-[10px] uppercase tracking-widest text-slate-600 font-black">
            <tr>
              <th className="px-10 py-5">Territory</th>
              <th className="px-10 py-5">Total Population</th>
              <th className="px-10 py-5">Verified Cases</th>
              <th className="px-10 py-5">Vital Restoration</th>
              <th className="px-10 py-5">Loss Metric</th>
              <th className="px-10 py-5">Current Threat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {countries.filter(c => c.country.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 80).map((c, i) => (
              <tr key={i} className="hover:bg-indigo-500/5 transition-all group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-7 rounded-lg overflow-hidden shadow-2xl border border-slate-700/50">
                        <img src={c.countryInfo.flag} className="w-full h-full object-cover" alt="" />
                    </div>
                    <span className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{c.country}</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-sm text-slate-500 font-bold">{formatNumber(c.population)}</td>
                <td className="px-10 py-6 text-sm text-slate-200 font-black">{formatNumber(c.cases)}</td>
                <td className="px-10 py-6 text-sm text-emerald-400 font-black tracking-tighter">{formatNumber(c.recovered)}</td>
                <td className="px-10 py-6 text-sm text-rose-500 font-black">{formatNumber(c.deaths)}</td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.active > 500000 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${c.active > 500000 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {c.active > 500000 ? 'Level 4' : 'Level 1'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- Main Auth & Wrapper ---
  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617] p-6">
        <div className="w-full max-w-lg p-12 glass-panel rounded-[3rem] border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x"></div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/40 group-hover:rotate-12 transition-transform duration-500">
              <LayoutDashboard size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">NEXUS COMMAND</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">Bios-Grid Access Layer</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commander ID</label>
              <input name="email" type="email" required defaultValue="commander@nexus.ai" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantum Token</label>
              <input type="password" defaultValue="password" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all text-lg tracking-widest uppercase">
              Establish Link
            </button>
          </form>
          <p className="text-center text-[9px] text-slate-700 mt-12 uppercase tracking-[0.4em] font-black">Encrypted via Nexus v9.4 Protocol</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className={`fixed lg:relative z-[60] w-80 h-full glass-panel border-r border-slate-800/50 transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-8">
          <div className="flex items-center gap-4 mb-14 px-2 group cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 group-hover:scale-110 transition-transform">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter">NEXUS</h2>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">OS V2.0</span>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            {[
              { id: 'dashboard', label: 'CORE Dashboard', icon: LayoutDashboard },
              { id: 'world', label: 'Global Registry', icon: Globe },
              { id: 'trends', label: 'Analytics Nexus', icon: BrainCircuit },
              { id: 'settings', label: 'Configuration', icon: Settings },
            ].map((item: any) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-5 px-6 py-5 rounded-[1.5rem] transition-all duration-500 group ${view === item.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40' : 'text-slate-500 hover:bg-slate-900/50 hover:text-white'}`}
              >
                <item.icon size={22} className={view === item.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-slate-800/50">
            <div className="p-5 bg-slate-900/60 rounded-[2rem] border border-slate-800/80 shadow-2xl group transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-xl text-white shadow-lg">
                  {user.name[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-white tracking-widest">{user.name}</p>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase">{user.level}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full text-center py-3 bg-slate-950/50 hover:bg-rose-500 hover:text-white text-[9px] font-black text-rose-500 border border-rose-500/20 rounded-xl transition-all uppercase tracking-widest">
                Sever Session
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-24 flex items-center justify-between px-10 bg-[#020617]/40 backdrop-blur-3xl border-b border-slate-800/30 sticky top-0 z-50">
          <div className="flex items-center gap-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 text-slate-500 hover:text-white hover:bg-slate-900 rounded-2xl transition-all">
              <Menu size={28} />
            </button>
            <div className="hidden sm:block">
               <h1 className="text-2xl font-black text-white uppercase tracking-tighter">{view}</h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Node Path: 0x4f..{view}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-[10px] font-black tracking-widest">
              <div className={`w-2.5 h-2.5 rounded-full ${systemStatus === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse shadow-glow`}></div>
              {systemStatus.toUpperCase()} STREAM
            </div>
            <div className="relative group">
              <Bell className="text-slate-500 cursor-pointer hover:text-white transition-all hover:scale-110" size={22} />
              {notifications.length > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></div>}
            </div>
            <div className="h-8 w-[1px] bg-slate-800/80"></div>
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-4 rounded-2xl transition-all duration-500 shadow-2xl relative ${isChatOpen ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-white'}`}
            >
              <MessageSquare size={24} />
              {!isChatOpen && <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>}
            </button>
          </div>
        </header>

        {/* Notifications Tray */}
        <div className="fixed top-28 right-10 z-[100] flex flex-col gap-4 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id} className="bg-slate-900 border border-indigo-500/40 text-white text-xs px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-12 fade-in duration-500 pointer-events-auto flex items-center gap-4">
              <Zap size={18} className="text-indigo-400 animate-pulse" />
              <span className="font-bold tracking-tight">{n.text}</span>
            </div>
          ))}
        </div>

        {/* Dynamic View Router */}
        <div className="flex-1 overflow-y-auto p-10 no-scrollbar scroll-smooth">
          {loading && view !== 'settings' ? (
             <div className="flex flex-col items-center justify-center h-full gap-8">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Database size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-white tracking-widest uppercase mb-2">Syncing Nexus Core</p>
                  <p className="text-xs text-slate-500 font-bold animate-pulse">Establishing secure link to global bio-registry...</p>
                </div>
             </div>
          ) : (
            <div className="max-w-[1600px] mx-auto">
              {view === 'dashboard' && <DashboardView />}
              {view === 'world' && <WorldView />}
              {view === 'trends' && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-in zoom-in-95 duration-700">
                  <div className="p-10 bg-indigo-600/5 rounded-full text-indigo-400 border border-indigo-500/10 shadow-2xl relative">
                    <BrainCircuit size={80} className="animate-bounce" />
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Alpha Build</div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black text-white tracking-tighter">ANALYTICS LAB</h2>
                    <p className="text-slate-500 max-w-xl mx-auto text-lg leading-relaxed">Neural predictive modeling and advanced bio-flux cross-referencing is being finalized in your sector.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => addNotification("Access Denied. Tier L9 Required.")} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 font-black transition-all border border-slate-800">REQUEST BYPASS</button>
                    <button onClick={() => setView('dashboard')} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white font-black transition-all shadow-2xl shadow-indigo-500/30">REVERT TO COMMAND</button>
                  </div>
                </div>
              )}
              {view === 'settings' && (
                <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-700">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-slate-900 rounded-3xl border border-slate-800">
                         <Settings size={40} className="text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-4xl font-black text-white tracking-tight">CONFIGURATION</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Node Parameters & UI Protocols</p>
                      </div>
                   </div>
                  
                  <div className="grid gap-6">
                    {[
                      { key: 'theme', label: 'Visual Interface', description: 'Protocol for system-wide aesthetic rendering.', options: ['Midnight Deep', 'Titanium Light', 'Neon Flux'] },
                      { key: 'refreshRate', label: 'Pulse Frequency', description: 'Global registry refresh rate in standard seconds.', options: [10, 30, 60, 0] },
                      { key: 'aiModel', label: 'Neural Architecture', description: 'Selection of large language model for assistant processing.', options: ['Gemini 3 Flash', 'Gemini 3 Pro'] },
                      { key: 'notifications', label: 'Alert Protocol', description: 'Real-time broadcast for system and data updates.', type: 'toggle' },
                    ].map((setting, i) => (
                      <div key={i} className="flex justify-between items-center p-8 glass-panel rounded-[2rem] border-slate-800 shadow-2xl hover:bg-slate-900/30 transition-all">
                        <div className="max-w-md">
                          <p className="text-lg font-black text-white uppercase tracking-tight mb-1">{setting.label}</p>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed">{setting.description}</p>
                        </div>
                        <div className="flex gap-2">
                           {setting.type === 'toggle' ? (
                             <button 
                              onClick={() => setConfig({...config, notifications: !config.notifications})}
                              className={`w-14 h-8 rounded-full transition-all relative ${config.notifications ? 'bg-indigo-600' : 'bg-slate-800'}`}
                             >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.notifications ? 'right-1' : 'left-1'}`}></div>
                             </button>
                           ) : (
                             <select 
                                value={(config as any)[setting.key]}
                                onChange={(e) => setConfig({...config, [setting.key]: e.target.value})}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                             >
                               {setting.options?.map(opt => <option key={opt} value={opt}>{opt === 0 ? 'Manual' : opt}</option>)}
                             </select>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-8 border-t border-slate-800/50 flex justify-center">
                     <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.5em]">Nexus Software Distribution © 2024</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Premium Streaming AI Chat Drawer */}
        <div className={`fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-slate-950/95 backdrop-blur-3xl border-l border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-in-out ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-[#020617]/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                  <BrainCircuit size={28} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tighter uppercase">AX-9 Intelligence</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Neural Link Established</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-3 text-slate-500 hover:text-white hover:bg-slate-900 rounded-xl transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar bg-gradient-to-b from-transparent to-slate-950/20">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-12 opacity-40">
                  <div className="p-8 bg-slate-900/50 rounded-full border border-slate-800">
                    <MessageSquare size={50} className="text-slate-700" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white uppercase tracking-tight">Awaiting Input</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Ask AX-9 about current bio-trends, specific territory analysis, or global restoration metrics.</p>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[90%] px-6 py-4 rounded-[2rem] text-sm leading-relaxed shadow-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none font-bold' : 'bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-800 font-medium'}`}>
                    {msg.text}
                    {msg.isStreaming && <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse"></span>}
                  </div>
                </div>
              ))}
              {isAiTyping && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].isStreaming === false && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/50 text-slate-500 px-6 py-4 rounded-3xl rounded-tl-none border border-slate-800/50 text-xs font-black italic animate-pulse uppercase tracking-widest">
                    Consulting Data Cluster...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-10 bg-[#020617]/80 border-t border-slate-800/50 backdrop-blur-xl">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
                <input 
                  type="text" 
                  placeholder="Inquire with AX-9 Interface..." 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="relative w-full bg-slate-950 border border-slate-800 rounded-[2rem] pl-8 pr-16 py-6 text-sm text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium placeholder:text-slate-700"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || isAiTyping}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all disabled:opacity-30 disabled:scale-95 active:scale-90"
                >
                  <Send size={20} />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-700 mt-6 uppercase tracking-[0.4em] font-black">Secure Quantum-Encrypted Neural Link</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);