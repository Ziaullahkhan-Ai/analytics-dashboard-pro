import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  MoreVertical
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types & Constants ---

interface GlobalStats {
  updated: number;
  cases: number;
  todayCases: number;
  deaths: number;
  todayDeaths: number;
  recovered: number;
  todayRecovered: number;
  active: number;
  critical: number;
  casesPerOneMillion: number;
  deathsPerOneMillion: number;
  tests: number;
  testsPerOneMillion: number;
  population: number;
  oneCasePerPeople: number;
  oneDeathPerPeople: number;
  oneTestPerPeople: number;
  activePerOneMillion: number;
  recoveredPerOneMillion: number;
  criticalPerOneMillion: number;
  affectedCountries: number;
}

interface CountryData {
  country: string;
  countryInfo: {
    iso2: string;
    iso3: string;
    flag: string;
  };
  cases: number;
  deaths: number;
  recovered: number;
  active: number;
  population: number;
  continent: string;
}

interface HistoricalData {
  cases: Record<string, number>;
  deaths: Record<string, number>;
  recovered: Record<string, number>;
}

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

// --- Utility Functions ---

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Mock Auth Service ---

const useAuth = () => {
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string) => {
    const newUser = { name: email.split('@')[0], email };
    setUser(newUser);
    localStorage.setItem('nexus_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nexus_user');
  };

  return { user, login, logout };
};

// --- Components ---

const StatCard = ({ title, value, change, icon: Icon, colorClass }: any) => (
  <div className="glass-panel p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:border-slate-500/50 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={24} className="text-white" />
      </div>
      {change && (
        <span className={`text-sm font-medium ${change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
          {change}
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-white tracking-tight">{formatNumber(value)}</p>
  </div>
);

const SectionHeader = ({ title, description, actions }: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
    <div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
    </div>
    <div className="flex items-center gap-3">
      {actions}
    </div>
  </div>
);

const App = () => {
  const { user, login, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [historical, setHistorical] = useState<HistoricalData | null>(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<keyof CountryData>('cases');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState('30');
  
  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [globalRes, countriesRes, historicalRes] = await Promise.all([
        fetch('https://disease.sh/v3/covid-19/all'),
        fetch('https://disease.sh/v3/covid-19/countries'),
        fetch(`https://disease.sh/v3/covid-19/historical/all?lastdays=${timeRange}`)
      ]);

      if (!globalRes.ok || !countriesRes.ok || !historicalRes.ok) throw new Error('API failed to respond');

      const gData = await globalRes.json();
      const cData = await countriesRes.json();
      const hData = await historicalRes.json();

      setGlobalStats(gData);
      setCountries(cData);
      setHistorical(hData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAndSortedCountries = useMemo(() => {
    return countries
      .filter(c => c.country.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const valA = a[sortKey] as number;
        const valB = b[sortKey] as number;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      })
      .slice(0, 100);
  }, [countries, searchTerm, sortKey, sortOrder]);

  const chartData = useMemo(() => {
    if (!historical) return [];
    return Object.keys(historical.cases).map(date => ({
      date: formatDate(date),
      cases: historical.cases[date],
      deaths: historical.deaths[date],
      recovered: historical.recovered[date]
    }));
  }, [historical]);

  const generateAIInsights = async () => {
    if (!globalStats) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Analyze the following global health data: 
        Total Cases: ${globalStats.cases}
        Active: ${globalStats.active}
        Recovered: ${globalStats.recovered}
        Deaths: ${globalStats.deaths}
        Total Population: ${globalStats.population}
        Provide a concise 3-bullet executive summary with trends and one key observation. Keep it professional and analytical.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { temperature: 0.7 }
      });
      
      setAiInsight(response.text);
    } catch (err) {
      console.error("AI Insight Error:", err);
      setAiInsight("Unable to generate insights at this time. Please check API configuration.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleSort = (key: keyof CountryData) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md p-8 glass-panel rounded-3xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Nexus Analytics</h1>
            <p className="text-slate-400 mt-2 text-center text-sm">Please sign in to access the command center.</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            login(formData.get('email') as string);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Professional Email</label>
              <input 
                name="email"
                type="email" 
                required 
                defaultValue="analyst@nexus.ai"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Access Token</label>
              <input 
                type="password" 
                defaultValue="••••••••"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Enter password"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              Authorize Session
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">Hackathon Edition v1.0 • Built with Google GenAI SDK</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {/* --- Sidebar --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-slate-800 transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Nexus</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Analytics Engine</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'world', label: 'World View', icon: Globe },
              { id: 'trends', label: 'Market Trends', icon: TrendingUp },
              { id: 'metrics', label: 'Key Metrics', icon: Activity },
              { id: 'security', label: 'Auth Status', icon: Users },
            ].map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${item.id === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-3 glass-panel rounded-xl mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
              <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-600">© 2024 Nexus Solutions Inc.</p>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
              <Menu size={24} />
            </button>
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search global datasets..."
                className="bg-slate-900/50 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              className={`p-2 text-slate-400 hover:text-indigo-400 transition-colors ${loading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
            <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
            <button 
              onClick={generateAIInsights}
              disabled={isAiLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {isAiLoading ? <RefreshCw size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
              AI INSIGHTS
            </button>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-950/20 no-scrollbar">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-400">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* AI Insights Modal/Panel */}
          {aiInsight && (
            <div className="glass-panel p-6 rounded-2xl border-indigo-500/30 bg-indigo-500/5 animate-in slide-in-from-top-4 duration-500 relative group">
              <button 
                onClick={() => setAiInsight(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl text-white">
                  <BrainCircuit size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">Executive AI Summary</h3>
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {aiInsight}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-32 glass-panel rounded-2xl animate-pulse-subtle"></div>
              ))
            ) : globalStats ? (
              <>
                <StatCard 
                  title="Total Cases" 
                  value={globalStats.cases} 
                  change={`+${formatNumber(globalStats.todayCases)}`}
                  icon={Activity} 
                  colorClass="bg-indigo-600" 
                />
                <StatCard 
                  title="Recovered" 
                  value={globalStats.recovered} 
                  change={`+${formatNumber(globalStats.todayRecovered)}`}
                  icon={Users} 
                  colorClass="bg-emerald-600" 
                />
                <StatCard 
                  title="Fatalities" 
                  value={globalStats.deaths} 
                  change={`+${formatNumber(globalStats.todayDeaths)}`}
                  icon={Skull} 
                  colorClass="bg-rose-600" 
                />
                <StatCard 
                  title="Active Cases" 
                  value={globalStats.active} 
                  icon={TrendingUp} 
                  colorClass="bg-amber-600" 
                />
              </>
            ) : null}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Trend Chart */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-2xl shadow-lg flex flex-col">
              <SectionHeader 
                title="Global Infection Trends" 
                description="Cumulative growth of cases and fatalities"
                actions={
                  <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-3 py-1.5 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="all">Full History</option>
                  </select>
                }
              />
              <div className="flex-1 chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => formatNumber(val)}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="cases" stroke="#6366f1" fillOpacity={1} fill="url(#colorCases)" strokeWidth={2} />
                    <Area type="monotone" dataKey="deaths" stroke="#f43f5e" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Pie */}
            <div className="glass-panel p-6 rounded-2xl shadow-lg flex flex-col">
              <SectionHeader 
                title="Status Breakdown" 
                description="Global distribution ratio"
              />
              <div className="flex-1 chart-container flex items-center justify-center">
                {globalStats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: globalStats.active },
                          { name: 'Recovered', value: globalStats.recovered },
                          { name: 'Deaths', value: globalStats.deaths },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.slice(0, 3).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Countries Data Table */}
          <div className="glass-panel rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Geographical Breakdown</h3>
                <p className="text-slate-400 text-sm">Detailed metrics by sovereign state</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                  />
                </div>
                <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Country</th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => toggleSort('cases')}>
                      <div className="flex items-center gap-1">
                        Cases {sortKey === 'cases' && (sortOrder === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => toggleSort('active')}>
                      <div className="flex items-center gap-1">
                        Active {sortKey === 'active' && (sortOrder === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => toggleSort('deaths')}>
                      <div className="flex items-center gap-1">
                        Fatalities {sortKey === 'deaths' && (sortOrder === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold cursor-pointer group" onClick={() => toggleSort('recovered')}>
                      <div className="flex items-center gap-1">
                        Recovered {sortKey === 'recovered' && (sortOrder === 'desc' ? <ChevronDown size={14}/> : <ChevronUp size={14}/>)}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-6 py-4"><div className="h-8 bg-slate-800/50 rounded-lg"></div></td>
                      </tr>
                    ))
                  ) : filteredAndSortedCountries.length > 0 ? (
                    filteredAndSortedCountries.map((c) => (
                      <tr key={c.country} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={c.countryInfo.flag} alt={c.country} className="w-6 h-4 object-cover rounded shadow-sm" />
                            <span className="text-sm font-medium text-white">{c.country}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{formatNumber(c.cases)}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            {formatNumber(c.active)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-rose-400 font-medium">{formatNumber(c.deaths)}</td>
                        <td className="px-6 py-4 text-sm text-emerald-400 font-medium">{formatNumber(c.recovered)}</td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-8">
                             <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={[{v: 0}, {v: c.cases}, {v: c.cases * 1.1}]}>
                                <Line type="monotone" dataKey="v" stroke={c.cases > 1000000 ? "#f43f5e" : "#10b981"} strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No data matching your criteria found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between text-xs text-slate-500">
              <p>Showing top {filteredAndSortedCountries.length} countries based on current sorting</p>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 disabled:opacity-50">Prev</button>
                <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 disabled:opacity-50">Next</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Menu for Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6">
        <button className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 border border-indigo-400/20 active:scale-95 transition-all">
          <MoreVertical size={24} />
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);