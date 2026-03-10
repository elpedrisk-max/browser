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
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Tab {
  id: string;
  url: string;
  title: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', url: 'https://www.wikipedia.org', title: 'Wikipedia' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [inputValue, setInputValue] = useState('https://www.wikipedia.org');
  const [isIframeBlocked, setIsIframeBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    setInputValue(activeTab.url);
    setIsIframeBlocked(false);
  }, [activeTabId]);

  const handleNavigate = (url: string) => {
    let finalUrl = url.trim();
    
    // Check if it's a URL or a search query
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
    if (!urlPattern.test(finalUrl) && !finalUrl.includes('localhost')) {
      // It's a search query
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
    } else if (!finalUrl.startsWith('http')) {
      finalUrl = `https://${finalUrl}`;
    }

    const newTabs = tabs.map(t => 
      t.id === activeTabId ? { ...t, url: finalUrl, title: finalUrl.replace(/^https?:\/\//, '') } : t
    );
    setTabs(newTabs);
    setInputValue(finalUrl);
    setIsIframeBlocked(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate(inputValue);
    }
  };

  const addTab = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab = { id: newId, url: 'https://www.wikipedia.org', title: 'New Tab' };
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
      const currentUrl = activeTab.url;
      // Force refresh by setting src to same value
      iframeRef.current.src = currentUrl;
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'meaburro12') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPasswordInput('');
    }
  };

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
            onClick={() => handleNavigate('https://www.wikipedia.org')}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600"
          >
            <Home size={18} />
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
            className="w-full bg-[#F5F5F5] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
            placeholder="Search or enter URL"
          />
        </div>
      </div>

      {/* Browser Viewport */}
      <div className="flex-1 relative bg-white">
        {isIframeBlocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Content Blocked by Provider</h2>
            <p className="text-gray-500 max-w-md mb-6">
              Many websites (like Google, YouTube, or Facebook) prevent themselves from being displayed inside an iframe for security reasons.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleNavigate('https://www.wikipedia.org')}
                className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Go to Wikipedia
              </button>
              <a 
                href={activeTab.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-6 py-2 border border-black/10 rounded-full font-medium hover:bg-black/5 transition-colors flex items-center gap-2"
              >
                Open in New Tab <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={activeTab.url}
          className="w-full h-full border-none"
          title="browser-viewport"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          onError={() => setIsIframeBlocked(true)}
          onLoad={() => {
            // Note: We can't actually detect X-Frame-Options errors via onLoad/onError easily
            // but we can provide a button to toggle the error state if the user sees it's blank
          }}
        />
        
        {/* Floating Info for Iframe limitations */}
        <div className="absolute bottom-4 right-4 z-10">
          <button 
            onClick={() => setIsIframeBlocked(!isIframeBlocked)}
            className="p-2 bg-white/80 backdrop-blur shadow-lg rounded-full text-gray-400 hover:text-black transition-colors border border-black/5"
            title="Toggle blocked content view"
          >
            <ShieldAlert size={16} />
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

