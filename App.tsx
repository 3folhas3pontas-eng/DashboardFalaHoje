
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import { NewsItem, FilterStatus } from './types';
import { generateNewsContent } from './geminiService';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Save, 
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  TriangleAlert,
  Newspaper,
  Layout,
  FileText,
  ShieldCheck,
  Zap,
  Activity,
  Terminal
} from 'lucide-react';

const App: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<FilterStatus>(FilterStatus.PENDING);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Automação
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoLogs, setAutoLogs] = useState<string[]>([]);
  const autoModeRef = useRef(isAutoMode);

  const [editedHook, setEditedHook] = useState('');      
  const [editedContent, setEditedContent] = useState('');   
  const [editedFaqs, setEditedFaqs] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const addLog = (msg: string) => {
    setAutoLogs(prev => [
      `${new Date().toLocaleTimeString()} - ${msg}`,
      ...prev.slice(0, 9)
    ]);
  };

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('noticias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const processAutoQueue = useCallback(async () => {
    if (!autoModeRef.current) return;

    addLog("🔍 Monitorando fila de rascunhos...");
    
    // 1. Busca pauta pendente (Rascunho OK, Conteúdo Final Vazio)
    const { data: pendentes, error } = await supabase
      .from('noticias')
      .select('*')
      .is('conteudo_final', null)
      .not('noticias', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      addLog(`❌ Erro de conexão: ${error.message}`);
      return;
    }

    if (!pendentes || pendentes.length === 0) {
      addLog("😴 Fila vazia. Aguardando novos rascunhos da API...");
      return;
    }

    const item = pendentes[0];
    addLog(`🤖 Processando: "${item.titulo.substring(0, 30)}..."`);

    try {
      // 2. IA Redige seguindo Fidelidade Factual
      const result = await generateNewsContent(item.titulo, item.noticias || '');
      
      // 3. Persistência Automática
      const { error: updateError } = await supabase
        .from('noticias')
        .update({
          noticias: result.hook,
          conteudo_final: result.content,
          faqs: result.faqs
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      addLog(`✅ Publicado: ${item.titulo}`);
      fetchNews(); // Atualiza UI
    } catch (err: any) {
      addLog(`❌ Erro na IA: ${err.message}`);
    }
  }, [fetchNews]);

  // Sincroniza ref com estado para o callback do Interval
  useEffect(() => {
    autoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  // Efeito do Loop Automático (2 minutos)
  useEffect(() => {
    let interval: number;
    if (isAutoMode) {
      addLog("🚀 Modo Automático Ativado");
      processAutoQueue(); // Primeira execução imediata
      interval = window.setInterval(processAutoQueue, 120000);
    } else {
      addLog("⏸️ Modo Automático Desativado");
    }
    return () => clearInterval(interval);
  }, [isAutoMode, processAutoQueue]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const filteredNews = news.filter(item => {
    const isReady = item.conteudo_final !== null && item.conteudo_final.trim() !== '';
    const statusMatch = filter === FilterStatus.PENDING ? !isReady : isReady;
    const searchMatch = item.titulo.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const handleSelectNews = (item: NewsItem) => {
    setSelectedNews(item);
    setEditedHook(item.noticias || '');
    setEditedContent(item.conteudo_final || '');
    setEditedFaqs(item.faqs || '');
  };

  const handleGenerateAI = async () => {
    if (!selectedNews) return;
    setIsGenerating(true);
    try {
      const generated = await generateNewsContent(selectedNews.titulo, selectedNews.noticias || '');
      setEditedHook(generated.hook);
      setEditedContent(generated.content);
      setEditedFaqs(generated.faqs);
    } catch (error: any) {
      alert(`Erro Editorial: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedNews) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('noticias')
        .update({
          noticias: editedHook,          
          conteudo_final: editedContent, 
          faqs: editedFaqs
        })
        .eq('titulo', selectedNews.titulo);

      if (error) throw error;
      fetchNews();
      alert('Matéria publicada com sucesso!');
    } catch (error: any) {
      alert(`Erro ao publicar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900">
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-2xl border-b border-indigo-500/20">
        <div className="max-w-[1700px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl">
              <Newspaper size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase">Fala Hoje <span className="text-indigo-400">Portal</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">IA Piloto Automático</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${isAutoMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800 border-slate-700'}`}>
               <span className={`text-[10px] font-black uppercase tracking-widest ${isAutoMode ? 'text-indigo-400' : 'text-slate-500'}`}>
                 Modo Automático
               </span>
               <button 
                onClick={() => setIsAutoMode(!isAutoMode)}
                className={`w-12 h-6 rounded-full relative transition-all ${isAutoMode ? 'bg-indigo-500' : 'bg-slate-600'}`}
               >
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAutoMode ? 'left-7' : 'left-1'}`} />
               </button>
            </div>

            <div className="h-10 w-px bg-slate-700 mx-2" />

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar pautas..."
                className="pl-12 pr-6 py-2.5 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm w-64 focus:border-indigo-500 outline-none transition-all text-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchNews} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700">
              <RefreshCw size={18} className={loading ? 'animate-spin text-indigo-400' : 'text-slate-400'} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1700px] mx-auto w-full px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        
        {/* Painel Lateral */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          
          {/* Dashboard Logs - New! */}
          <div className="bg-slate-900 rounded-[1.5rem] p-5 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividade do Robô</span>
              </div>
              {isAutoMode && <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>}
            </div>
            <div className="space-y-2 h-32 overflow-hidden">
              {autoLogs.length > 0 ? autoLogs.map((log, i) => (
                <p key={i} className="text-[10px] font-mono text-slate-400 truncate border-l border-slate-700 pl-3">
                  {log}
                </p>
              )) : (
                <p className="text-[10px] text-slate-600 italic mt-10 text-center">Inicie o modo automático...</p>
              )}
            </div>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => { setFilter(FilterStatus.PENDING); setSelectedNews(null); }}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${filter === FilterStatus.PENDING ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Clock size={14} /> Pendentes
            </button>
            <button 
              onClick={() => { setFilter(FilterStatus.READY); setSelectedNews(null); }}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${filter === FilterStatus.READY ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <CheckCircle2 size={14} /> Prontas
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fila de Produção</span>
              <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">{filteredNews.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading ? (
                <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" /></div>
              ) : (
                filteredNews.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNews(item)}
                    className={`w-full text-left p-6 hover:bg-indigo-50/30 transition-all border-l-4 group ${selectedNews?.titulo === item.titulo ? 'bg-indigo-50/50 border-l-indigo-600' : 'border-l-transparent'}`}
                  >
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 group-hover:text-indigo-400 transition-colors">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <h3 className={`font-bold text-sm leading-snug group-hover:text-indigo-800 transition-colors ${selectedNews?.titulo === item.titulo ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {item.titulo}
                    </h3>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Workspace Editorial */}
        <div className="lg:col-span-9 overflow-hidden h-full">
          {selectedNews ? (
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <div className="p-8 border-b bg-white flex items-center justify-between gap-8">
                <div className="flex-1 min-w-0 pr-8">
                  <h2 className="text-2xl font-black text-slate-900 truncate mb-2 leading-none">{selectedNews.titulo}</h2>
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">
                      <ShieldCheck size={14} /> Fidelidade Ativada
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Redigir
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || isGenerating}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Publicar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#FDFEFF] p-10 space-y-12">
                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                  <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-3 block flex items-center gap-2">
                    <FileText size={12} /> Rascunho da API (Fonte Única)
                  </label>
                  <div className="text-xs text-amber-900/60 leading-relaxed font-medium italic">
                    {selectedNews.noticias || "Nenhum dado bruto encontrado."}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-indigo-50 shadow-sm">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 block">1. Gancho Editorial (Home)</label>
                  <textarea 
                    value={editedHook}
                    onChange={(e) => setEditedHook(e.target.value)}
                    className="w-full min-h-[80px] p-0 bg-transparent border-none focus:ring-0 text-slate-700 font-bold text-lg leading-relaxed resize-none italic outline-none"
                  />
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">2. Matéria Jornalística (Corpo)</label>
                  <textarea 
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full min-h-[600px] p-0 bg-transparent border-none focus:ring-0 text-slate-900 leading-[1.8] font-serif text-2xl placeholder:text-slate-100 resize-none outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all ${isAutoMode ? 'bg-indigo-50 text-indigo-500 animate-pulse' : 'bg-slate-50 text-slate-200'}`}>
                {isAutoMode ? <Zap size={40} /> : <ShieldCheck size={40} />}
              </div>
              <h3 className="font-black text-slate-900 text-xl mb-3">
                {isAutoMode ? "Modo Piloto Ativado" : "Aguardando Comando"}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed font-medium">
                {isAutoMode 
                  ? "O robô está processando as pautas pendentes. Novas matérias aparecerão no site automaticamente." 
                  : "Selecione uma pauta para redigir manualmente ou ative o Modo Automático no cabeçalho."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
