/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Search, 
  Home, 
  ShieldAlert,
  ExternalLink,
  Globe,
  Plus,
  X,
  Lock,
  BookOpen,
  Youtube,
  Play
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Tab {
  id: string;
  url: string;
  title: string;
  isHome?: boolean;
}

const SHORTCUTS = [
  { name: 'Google', url: 'https://www.google.com/search?igu=1', color: 'bg-blue-500' },
  { name: 'YouTube', url: 'https://www.youtube.com', color: 'bg-red-600' },
  { name: 'TikTok', url: 'https://www.tiktok.com', color: 'bg-black' },
  { name: 'Instagram', url: 'https://www.instagram.com', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', color: 'bg-green-500' },
  { name: 'Twitch', url: 'https://www.twitch.tv', color: 'bg-purple-600' },
  { name: 'Facebook', url: 'https://www.facebook.com', color: 'bg-blue-600' },
  { name: 'Twitter', url: 'https://www.twitter.com', color: 'bg-sky-500' },
];

const BLOCKED_SITES = [
  'youtube.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'netflix.com',
  'disneyplus.com'
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [noBooks, setNoBooks] = useState(false);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: '', title: 'Inicio', isHome: true }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [inputValue, setInputValue] = useState('');
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [wikiResult, setWikiResult] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isYoutubeSearch, setIsYoutubeSearch] = useState(false);
  const [isWikiSearch, setIsWikiSearch] = useState(false);
  const [isBlockedSite, setIsBlockedSite] = useState(false);
  const [blockedSiteUrl, setBlockedSiteUrl] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = React.useMemo(() => 
    tabs.find(t => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  useEffect(() => {
    setInputValue(activeTab.isHome ? '' : activeTab.url);
    setIsIframeBlocked(false);
  }, [activeTabId]);

  const handleNavigate = async (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;

    setIsLoading(true);
    setIsIframeBlocked(false);
    setIsYoutubeSearch(false);
    setIsWikiSearch(false);
    setIsBlockedSite(false);
    setWikiResult(null);
    setAiSummary(null);

    // Wikipedia API Integration
    if (finalUrl.toLowerCase().startsWith('w:') || finalUrl.toLowerCase().startsWith('wiki:')) {
      const query = finalUrl.replace(/^(w:|wiki:)/i, '').trim();
      try {
        const response = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        setWikiResult(response.data);
        setIsWikiSearch(true);
        setIsLoading(false);
        const newTabs = tabs.map(t => 
          t.id === activeTabId ? { ...t, url: 'wiki-search', title: `Wiki: ${query}`, isHome: false } : t
        );
        setTabs(newTabs);
        setInputValue(finalUrl);
        return;
      } catch (error) {
        console.error("Wikipedia API Error:", error);
        // Fallback to normal search if wiki fails
        finalUrl = `https://es.wikipedia.org/wiki/${encodeURIComponent(query)}`;
      }
    }

    // YouTube Data API Integration
    if (finalUrl.toLowerCase().startsWith('yt:') || finalUrl.toLowerCase().startsWith('youtube:')) {
      const query = finalUrl.replace(/^(yt:|youtube:)/i, '').trim();
      setYoutubeError(null);
      try {
        const apiKey = (import.meta as any).env?.VITE_YOUTUBE_API_KEY || 'AIzaSyB99I0VEd2kQpBxA9vRfL2HjY-ZLOLgmas';
        const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
          params: {
            part: 'snippet',
            maxResults: 12,
            q: query,
            type: 'video',
            key: apiKey
          },
          timeout: 5000
        });
        setYoutubeResults(response.data.items);
        setIsYoutubeSearch(true);
        setIsLoading(false);
        const newTabs = tabs.map(t => 
          t.id === activeTabId ? { ...t, url: 'youtube-search', title: `YouTube: ${query}`, isHome: false } : t
        );
        setTabs(newTabs);
        setInputValue(finalUrl);
        return;
      } catch (error: any) {
        console.error("YouTube API Error:", error);
        const errorMsg = error.response?.data?.error?.message || "Error al conectar con YouTube.";
        setYoutubeError(errorMsg);
        setIsYoutubeSearch(true);
        setYoutubeResults([]);
        setIsLoading(false);
        return;
      }
    }
    
    // Check if it's a URL or a search query
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
    if (!urlPattern.test(finalUrl) && !finalUrl.includes('localhost') && !finalUrl.includes('127.0.0.1')) {
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
    } else if (!finalUrl.startsWith('http') && !finalUrl.startsWith('/')) {
      finalUrl = `https://${finalUrl}`;
    }

    // Detect if the site is likely to be blocked or broken in proxy
    const isDifficultSite = BLOCKED_SITES.some(site => finalUrl.toLowerCase().includes(site));
    
    // Use proxy for sites that block iframes (except Google with igu=1)
    let displayUrl = finalUrl;
    if (!finalUrl.includes('google.com/search') && !finalUrl.startsWith('/') && !finalUrl.includes('youtube.com/embed')) {
      displayUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
    }

    const newTabs = tabs.map(t => 
      t.id === activeTabId ? { 
        ...t, 
        url: displayUrl, 
        title: finalUrl.replace(/^https?:\/\//, '').split('/')[0], 
        isHome: false 
      } : t
    );
    setTabs(newTabs);
    setInputValue(finalUrl);
    
    // Si es un sitio difícil, mostramos el aviso pero TAMBIÉN intentamos cargarlo en el iframe (vía proxy)
    if (isDifficultSite && !finalUrl.includes('google.com/search')) {
      setIsBlockedSite(true);
      setBlockedSiteUrl(finalUrl);
    } else {
      setIsBlockedSite(false);
    }

    setIsIframeBlocked(false);
    setIsLoading(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate(inputValue);
    }
  };

  const addTab = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab = { id: newId, url: '', title: 'Inicio', isHome: true };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const removeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const refresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setIsIframeBlocked(false);
      
      // Intentar sincronizar antes de refrescar
      try {
        const currentIframeUrl = iframeRef.current?.contentWindow?.location.href;
        if (currentIframeUrl && currentIframeUrl !== 'about:blank') {
          let actualUrl = currentIframeUrl;
          if (currentIframeUrl.includes('/api/proxy?url=')) {
            actualUrl = decodeURIComponent(currentIframeUrl.split('url=')[1]);
          }
          setInputValue(actualUrl);
        }
      } catch (e) {
        // Ignorar error de origen cruzado
      }
      
      // Force refresh
      iframeRef.current.src = activeTab.url;
    }
  };

  const summarizeCurrentPage = async () => {
    setIsAiLoading(true);
    setAiSummary(null);
    try {
      const url = activeTab.url.includes('/api/proxy?url=') 
        ? decodeURIComponent(activeTab.url.split('url=')[1])
        : activeTab.url;
      
      const prompt = `Estás actuando como un asistente de navegación. Por favor, resume de forma concisa (máximo 3 párrafos) el contenido de esta página web: ${url}. Si no puedes acceder al contenido directamente, explica qué es este sitio web basándote en su URL. Usa un tono amigable y profesional.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      setAiSummary(response.text || "No se pudo generar un resumen.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiSummary("Error al conectar con la IA. Asegúrate de que la página sea accesible.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.toLowerCase() === 'meaburro12') {
      setShowIntro(true);
      setError(false);
      setNoBooks(false);
      // Wait for intro animation to finish (approx 4.5 seconds)
      setTimeout(() => {
        setIsAuthenticated(true);
        setShowIntro(false);
      }, 4500);
    } else if (passwordInput === 'ingles2026') {
      setNoBooks(true);
      setError(false);
      setPasswordInput('');
    } else {
      setError(true);
      setNoBooks(false);
      setPasswordInput('');
    }
  };

  if (showIntro) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
        {/* LED Glow Background */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            backgroundColor: ['#0000ff', '#00ff00', '#0000ff']
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 blur-[120px] opacity-30"
        />
        
        {/* Particle/Sparkle Effects */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: 0,
              opacity: 0 
            }}
            animate={{ 
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              y: Math.random() * -200
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"
          />
        ))}

        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ scale: 0.5, opacity: 0, letterSpacing: "0.5em" }}
            animate={{ 
              scale: [0.5, 1.2, 1], 
              opacity: 1,
              letterSpacing: ["0.5em", "0.1em", "0.2em"],
              textShadow: [
                "0 0 20px #fff, 0 0 40px #00f, 0 0 60px #00f",
                "0 0 20px #fff, 0 0 40px #0f0, 0 0 60px #0f0",
                "0 0 20px #fff, 0 0 40px #00f, 0 0 60px #00f"
              ]
            }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black text-white uppercase tracking-widest"
          >
            PEDRO ANGEL NOVA
          </motion.h1>
          
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1, duration: 2 }}
            className="h-1 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500 mt-4 shadow-[0_0_15px_rgba(0,255,0,0.5)]"
          />
        </div>

        {/* Flash effect at the end */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1] }}
          transition={{ delay: 4, duration: 0.5 }}
          className="absolute inset-0 bg-white z-20"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F5F5] font-sans p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">Cambridge English</h1>
            <p className="text-gray-500 text-center mt-2">Introduce tu contraseña para acceder al libro de inglés Cambridge</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Contraseña"
                className={`w-full bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-200'} rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all`}
                autoFocus
              />
            </div>
            
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-medium text-center"
              >
                Contraseña incorrecta. Inténtalo de nuevo.
              </motion.p>
            )}

            {noBooks && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4"
              >
                <p className="text-amber-800 text-xs font-medium text-center">
                  No hay libros disponibles actualmente para este acceso.
                </p>
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            >
              Acceder
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Secure Access System</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] font-sans overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center bg-[#E0E0E0] px-2 pt-2 gap-1 overflow-x-auto no-scrollbar border-b border-black/5">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all duration-200 min-w-[120px] max-w-[200px]
                ${activeTabId === tab.id 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'}
              `}
            >
              <Globe size={14} className="shrink-0" />
              <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => removeTab(tab.id, e)}
                  className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <button 
          onClick={addTab}
          className="p-2 mb-1 rounded-full hover:bg-white/50 text-gray-600 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Browser Controls */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-black/5 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-black/5 text-gray-400 cursor-not-allowed">
            <ArrowLeft size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-black/5 text-gray-400 cursor-not-allowed">
            <ArrowRight size={18} />
          </button>
          <button onClick={refresh} className="p-2 rounded-full hover:bg-black/5 text-gray-600">
            <RotateCw size={18} />
          </button>
          <button 
            onClick={() => handleNavigate('https://www.google.com/search?igu=1')}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600"
          >
            <Home size={18} />
          </button>
          <button 
            onClick={() => {
              const newTabs = tabs.map(t => t.id === activeTabId ? { ...t, url: '', title: 'Inicio', isHome: true } : t);
              setTabs(newTabs);
              setInputValue('');
            }}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600"
            title="Página de inicio"
          >
            <Globe size={18} />
          </button>
          <button 
            onClick={summarizeCurrentPage}
            disabled={activeTab.isHome || isAiLoading}
            className={`p-2 rounded-full transition-all ${isAiLoading ? 'animate-pulse bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50 text-indigo-600'}`}
            title="Resumir con IA"
          >
            <BookOpen size={18} />
          </button>
        </div>

        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#F5F5F5] border-none rounded-full py-2 pl-10 pr-10 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
            placeholder="Search or enter URL"
          />
          <div className="absolute inset-y-0 right-3 flex items-center gap-2">
            <button 
              onClick={() => {
                const url = activeTab.url.includes('/api/proxy?url=') 
                  ? decodeURIComponent(activeTab.url.split('url=')[1])
                  : activeTab.url;
                if (url && url !== 'youtube-search') {
                  handleNavigate(url);
                }
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
              title="Forzar carga en navegador interno"
            >
              <Globe size={14} />
            </button>
            <button 
              onClick={() => {
                const url = activeTab.url.includes('/api/proxy?url=') 
                  ? decodeURIComponent(activeTab.url.split('url=')[1])
                  : activeTab.url;
                window.open(url, '_blank');
              }}
              className="p-1.5 text-gray-400 hover:text-black transition-colors"
              title="Abrir fuera (si falla)"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 relative bg-white">
        {activeTab.isHome ? (
          <div className="absolute inset-0 z-30 bg-[#F5F5F5] overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center mb-12 mt-8">
                <div className="w-20 h-20 bg-black text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl">
                  <Globe size={40} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">PETERBWORSER</h2>
                <p className="text-gray-500 mt-2">Tu puerta de acceso a la web</p>
                <div className="mt-4 text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-black/5 flex gap-4">
                  <span><span className="font-mono font-bold text-black">yt:</span> YouTube</span>
                  <span><span className="font-mono font-bold text-black">w:</span> Wikipedia</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {SHORTCUTS.map((site) => (
                  <motion.button
                    key={site.name}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavigate(site.url)}
                    className="flex flex-col items-center p-6 bg-white rounded-3xl shadow-sm border border-black/5 hover:shadow-md transition-all group"
                  >
                    <div className={`w-12 h-12 ${site.color} rounded-2xl flex items-center justify-center mb-3 text-white font-bold text-xl shadow-lg group-hover:rotate-6 transition-transform`}>
                      {site.name[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{site.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : isWikiSearch ? (
          <div className="absolute inset-0 z-30 bg-white overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              {wikiResult ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-black/5 shadow-xl overflow-hidden"
                >
                  {wikiResult.thumbnail && (
                    <div className="w-full h-64 overflow-hidden">
                      <img 
                        src={wikiResult.thumbnail.source} 
                        alt={wikiResult.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                        <BookOpen size={24} />
                      </div>
                      <h2 className="text-4xl font-bold text-gray-900">{wikiResult.title}</h2>
                    </div>
                    <p className="text-xl text-gray-600 leading-relaxed mb-8">
                      {wikiResult.extract}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => handleNavigate(wikiResult.content_urls.desktop.page)}
                        className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                      >
                        <ExternalLink size={20} />
                        Leer artículo completo
                      </button>
                      <button 
                        onClick={() => {
                          const query = wikiResult.title;
                          handleNavigate(`https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`);
                        }}
                        className="bg-white text-gray-600 border border-black/5 px-8 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                      >
                        <Search size={20} />
                        Buscar en Google
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-20 text-gray-400">Cargando información de Wikipedia...</div>
              )}
            </div>
          </div>
        ) : isYoutubeSearch ? (
          <div className="absolute inset-0 z-30 bg-white overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center">
                    <Youtube size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Resultados de YouTube</h2>
                </div>
                <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-black/5">
                  Usando YouTube Data API v3
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {youtubeError ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center bg-red-50 rounded-3xl border border-red-100 p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                      <ShieldAlert size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Error de YouTube API</h3>
                    <p className="text-gray-600 max-w-md mb-6">{youtubeError}</p>
                    <button 
                      onClick={() => {
                        const query = activeTab.title.replace('YouTube: ', '');
                        handleNavigate(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
                      }}
                      className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
                    >
                      <Youtube size={20} />
                      Buscar directamente en YouTube
                    </button>
                  </div>
                ) : youtubeResults.length > 0 ? (
                  youtubeResults.map((video) => (
                    <motion.div 
                      key={video.id.videoId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl overflow-hidden border border-black/5 hover:shadow-xl transition-all cursor-pointer group"
                      onClick={() => {
                        const embedUrl = `https://www.youtube.com/embed/${video.id.videoId}?autoplay=1`;
                        const newTabs = tabs.map(t => 
                          t.id === activeTabId ? { ...t, url: embedUrl, title: video.snippet.title, isHome: false } : t
                        );
                        setTabs(newTabs);
                        setIsYoutubeSearch(false);
                        setIsBlockedSite(false);
                      }}
                    >
                      <div className="relative aspect-video">
                        <img 
                          src={video.snippet.thumbnails.high.url} 
                          alt={video.snippet.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all shadow-xl">
                            <Play size={24} fill="currentColor" />
                          </div>
                          <div className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                            <Globe size={14} />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                          {video.snippet.title}
                        </h3>
                        <p className="text-xs text-gray-500">{video.snippet.channelTitle}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    No se encontraron resultados.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-gray-600 animate-pulse">Cargando página...</p>
                <p className="text-xs text-gray-400 mt-2">Estamos optimizando el contenido para ti</p>
              </div>
            )}

            {isBlockedSite && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F9FAFB] p-8 text-center">
                <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-6 border border-black/5">
                  <ShieldAlert size={40} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Sitio Protegido</h2>
                <p className="text-gray-600 max-w-md mb-8 leading-relaxed">
                  Este sitio ({new URL(blockedSiteUrl).hostname}) tiene medidas de seguridad que impiden mostrarlo aquí dentro.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                  <button 
                    onClick={() => {
                      setIsBlockedSite(false);
                      // Si ya estamos en la URL proxied, no hace falta recargar
                      const displayUrl = `/api/proxy?url=${encodeURIComponent(blockedSiteUrl)}`;
                      if (activeTab.url !== displayUrl) {
                        setIsLoading(true);
                        const newTabs = tabs.map(t => 
                          t.id === activeTabId ? { ...t, url: displayUrl, title: blockedSiteUrl.replace(/^https?:\/\//, '').split('/')[0], isHome: false } : t
                        );
                        setTabs(newTabs);
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
                  >
                    <Globe size={20} />
                    Intentar cargar aquí
                  </button>

                  <button 
                    onClick={() => window.open(blockedSiteUrl, '_blank')}
                    className="flex items-center justify-center gap-2 bg-black text-white px-6 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                  >
                    <ExternalLink size={20} />
                    Abrir en pestaña nueva
                  </button>
                  
                  {blockedSiteUrl.includes('youtube.com') && (
                    <button 
                      onClick={() => {
                        const query = prompt('¿Qué quieres buscar en YouTube?');
                        if (query) handleNavigate(`yt:${query}`);
                      }}
                      className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
                    >
                      <Youtube size={20} />
                      Usar YouTube API
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      const newTabs = tabs.map(t => t.id === activeTabId ? { ...t, url: '', title: 'Inicio', isHome: true } : t);
                      setTabs(newTabs);
                      setIsBlockedSite(false);
                    }}
                    className="sm:col-span-2 flex items-center justify-center gap-2 bg-white text-gray-600 border border-black/5 px-6 py-3 rounded-2xl font-medium hover:bg-gray-50 transition-all"
                  >
                    <Home size={18} />
                    Volver al inicio
                  </button>
                </div>
              </div>
            )}

            {isIframeBlocked && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h2 className="text-xl font-semibold mb-2">Contenido Bloqueado</h2>
                <p className="text-gray-500 max-w-md mb-6">
                  Muchos sitios web (como Google, YouTube o redes sociales) prohíben mostrarse dentro de otras apps por seguridad.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => {
                      const newTabs = tabs.map(t => t.id === activeTabId ? { ...t, url: '', title: 'Inicio', isHome: true } : t);
                      setTabs(newTabs);
                    }}
                    className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={activeTab.url}
              className="w-full h-full border-none"
              title="browser-viewport"
              sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
              onError={() => setIsIframeBlocked(true)}
              onLoad={() => {
                setIsLoading(false);
                try {
                  const currentIframeUrl = iframeRef.current?.contentWindow?.location.href;
                  if (currentIframeUrl && currentIframeUrl !== 'about:blank') {
                    let actualUrl = currentIframeUrl;
                    
                    // Extraer la URL real si estamos en el proxy
                    if (currentIframeUrl.includes('/api/proxy?url=')) {
                      const parts = currentIframeUrl.split('url=');
                      if (parts.length > 1) {
                        actualUrl = decodeURIComponent(parts[1]);
                      }
                    }
                    
                    // Obtener la URL real que tenemos guardada en el estado
                    let storedRealUrl = activeTab.url;
                    if (activeTab.url.includes('/api/proxy?url=')) {
                      const parts = activeTab.url.split('url=');
                      if (parts.length > 1) {
                        storedRealUrl = decodeURIComponent(parts[1]);
                      }
                    }

                    // Si la URL real del iframe ha cambiado (navegación interna)
                    if (actualUrl !== storedRealUrl && !actualUrl.includes('youtube-search') && !actualUrl.startsWith('blob:')) {
                      setInputValue(actualUrl);
                      
                      // Determinar si la nueva URL debería estar proxied
                      let nextDisplayUrl = actualUrl;
                      if (!actualUrl.includes('google.com/search') && !actualUrl.includes('youtube.com/embed')) {
                        nextDisplayUrl = `/api/proxy?url=${encodeURIComponent(actualUrl)}`;
                      }

                      const newTabs = tabs.map(t => 
                        t.id === activeTabId ? { ...t, url: nextDisplayUrl, title: actualUrl.replace(/^https?:\/\//, '').split('/')[0] } : t
                      );
                      setTabs(newTabs);
                    }
                  }
                } catch (e) {
                  console.log("Navegación interna detectada (origen cruzado)");
                }
              }}
            />
          </>
        )}
        
        {/* Floating Info for Iframe limitations */}
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          <AnimatePresence>
            {aiSummary && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white border border-indigo-100 shadow-2xl rounded-3xl p-6 max-w-sm mb-4 relative"
              >
                <button 
                  onClick={() => setAiSummary(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-black"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 mb-3 text-indigo-600">
                  <BookOpen size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Resumen de IA</span>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {aiSummary}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isIframeBlocked && !aiSummary && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-black text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg mb-2 max-w-[200px]"
            >
              ¿No carga? Algunos sitios bloquean el acceso dentro de apps.
            </motion.div>
          )}
          <button 
            onClick={() => setIsIframeBlocked(!isIframeBlocked)}
            className="p-3 bg-white shadow-xl rounded-full text-gray-400 hover:text-black transition-colors border border-black/5"
            title="¿Problemas con la página?"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

