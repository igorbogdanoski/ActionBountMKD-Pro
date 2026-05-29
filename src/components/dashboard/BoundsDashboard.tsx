import { useState, useEffect } from 'react';
import { Plus, Search, Play, Edit2, Trash2, Heart, Cloud, CloudOff, X, Check } from 'lucide-react';
import { getQuests, deleteQuest, saveQuest, cacheQuestResources } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';
import { Quest } from '../../types';

interface BoundsDashboardProps {
  onCreateNew: () => void;
}

export function BoundsDashboard({ onCreateNew }: BoundsDashboardProps) {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [downloadedQuests, setDownloadedQuests] = useState<string[]>([]);
  const [editModalQuest, setEditModalQuest] = useState<Quest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Basic mobile detection
    setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768);
    
    const favs = localStorage.getItem('actionbound_fav_dashboard');
    if (favs) setFavorites(JSON.parse(favs));
    
    const downloads = localStorage.getItem('actionbound_downloaded');
    if (downloads) setDownloadedQuests(JSON.parse(downloads));
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('actionbound_fav_dashboard', JSON.stringify(newFavs));
  };

  const toggleDownload = (quest: Quest, e: React.MouseEvent) => {
    e.stopPropagation();
    const isDownloaded = downloadedQuests.includes(quest.id);
    const newDownloads = isDownloaded
      ? downloadedQuests.filter(dlId => dlId !== quest.id)
      : [...downloadedQuests, quest.id];
    setDownloadedQuests(newDownloads);
    localStorage.setItem('actionbound_downloaded', JSON.stringify(newDownloads));
    
    if (!isDownloaded) {
      cacheQuestResources(quest);
    }
  };

  const handleEditSave = async () => {
    if (!editModalQuest) return;
    const updatedQuest = { ...editModalQuest, title: editTitle, description: editDesc, updatedAt: new Date().toISOString() };
    await saveQuest(updatedQuest);
    setEditModalQuest(null);
    loadQuests();
  };
  
  const loadQuests = async () => {
    if (!user) return;
    const data = await getQuests(user.uid);
    setQuests(data);
  };

  useEffect(() => {
    loadQuests();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (confirm('Дали сте сигурни дека сакате да ја избришете оваа авантура?')) {
      await deleteQuest(id);
      loadQuests();
    }
  };

  return (
    <div className="space-y-6 mx-auto max-w-6xl w-full p-4 md:p-8">
      {/* Install PWA Banner */}
      {isMobile && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl px-5 py-4 text-white flex items-center justify-between shadow-lg mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
               </svg>
             </div>
             <div>
               <h3 className="font-bold">АПП ЗА МОБИЛЕН</h3>
               <p className="text-xs text-indigo-100 font-medium">Кликнете тука за инсталација</p>
             </div>
          </div>
          <button className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform active:scale-95">
             Инсталирај
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight dark:text-slate-100 text-slate-900">Мои Авантури</h2>
          <p className="text-sm dark:text-slate-400 text-slate-600 mt-1">Управувајте со вашите квестови, уредувајте или креирајте нови.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onCreateNew}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Нова Авантура
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center dark:bg-slate-800 bg-slate-50 p-4 rounded-xl shadow-sm border dark:border-slate-700 border-slate-200">
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 dark:text-slate-400 text-slate-600" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 dark:bg-slate-900 bg-white py-2 pl-9 pr-3 dark:text-slate-200 text-slate-800 ring-1 ring-inset ring-slate-700 placeholder:dark:text-slate-400 text-slate-600 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
            placeholder="Пребарај авантури..."
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select aria-label="Филтрирај по статус" className="block w-full sm:w-auto rounded-md border-0 dark:bg-slate-900 bg-white py-2 pl-3 pr-10 dark:text-slate-200 text-slate-800 ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6">
            <option>Сите статуси</option>
            <option>Објавени</option>
            <option>Нацрт</option>
          </select>
        </div>
      </div>

      {/* Grid of bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quests.map((quest) => (
          <div key={quest.id} className={`group flex flex-col overflow-hidden rounded-xl dark:bg-slate-800 bg-slate-50 shadow-sm border transition-all hover:shadow-emerald-500/10 hover:border-slate-600 ${favorites.includes(quest.id) ? 'border-emerald-500/50' : 'dark:border-slate-700 border-slate-200'} relative`}>
            {/* Absolute icons on top */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button 
                onClick={(e) => toggleDownload(quest, e)}
                title={downloadedQuests.includes(quest.id) ? "Преземено (офлајн)" : "Зачувај офлајн"}
                className={`p-2 rounded-full shadow-lg backdrop-blur-md transition-all ${
                  downloadedQuests.includes(quest.id) 
                    ? 'bg-emerald-500/90 text-white hover:bg-emerald-600' 
                    : 'dark:bg-slate-900 bg-white/60 dark:text-slate-300 text-slate-700 hover:dark:bg-slate-800 bg-slate-50'
                }`}
              >
                {downloadedQuests.includes(quest.id) ? <Cloud className="w-4 h-4 fill-current" /> : <CloudOff className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label={favorites.includes(quest.id) ? 'Отстрани од омилени' : 'Додај во омилени'}
                onClick={(e) => toggleFavorite(quest.id, e)}
                className={`p-2 rounded-full shadow-lg backdrop-blur-md transition-all ${
                  favorites.includes(quest.id)
                    ? 'bg-rose-500/90 text-white hover:bg-rose-600'
                    : 'dark:bg-slate-900 bg-white/60 dark:text-slate-300 text-slate-700 hover:dark:bg-slate-800 bg-slate-50 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.includes(quest.id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="aspect-[16/9] w-full overflow-hidden dark:bg-slate-900 bg-white relative">
              {quest.coverImage && (
                <img src={quest.coverImage} alt={quest.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
              <div className="absolute bottom-3 left-3 z-10 w-full pr-8">
                 <h3 className="text-xl font-bold dark:text-slate-100 text-slate-900 line-clamp-1">{quest.title}</h3>
                 <p className="dark:text-slate-300 text-slate-700 text-sm line-clamp-1">{quest.description}</p>
              </div>
              <div className="absolute top-3 left-3 z-10">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold uppercase shadow-sm backdrop-blur-sm bg-emerald-500/20 text-emerald-400`}>
                  Активно
                </span>
              </div>
            </div>
            
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between text-sm dark:text-slate-400 text-slate-600 mb-4">
                <div className="flex items-center">
                  <span className="font-bold dark:text-slate-200 text-slate-800">{quest.stages?.length || 0}</span>
                  <span className="ml-1">етапи</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold dark:text-slate-200 text-slate-800">0</span>
                  <span className="ml-1">играња</span>
                </div>
              </div>
              
              <div className="pt-4 border-t dark:border-slate-700 border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>ИД: {quest.id}</span>
              </div>
            </div>
            
            <div className="absolute inset-x-0 bottom-0 translate-y-full dark:bg-slate-800 bg-slate-50/95 backdrop-blur-sm border-t dark:border-slate-700 border-slate-200 p-4 transition-transform duration-300 ease-in-out group-hover:translate-y-0 flex justify-around">
              <button 
                onClick={() => window.location.href = `/play/${quest.id}`}
                className="flex flex-col items-center justify-center p-2 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Play className="h-5 w-5 mb-1" />
                <span className="text-xs font-bold">Играј</span>
              </button>
              <button 
                onClick={() => {
                  setEditModalQuest(quest);
                  setEditTitle(quest.title);
                  setEditDesc(quest.description);
                }}
                className="flex flex-col items-center justify-center p-2 dark:text-slate-400 text-slate-600 hover:text-indigo-400 transition-colors"
              >
                <Edit2 className="h-5 w-5 mb-1" />
                <span className="text-xs font-bold">Брзо Уреди</span>
              </button>
              <button 
                onClick={() => handleDelete(quest.id)}
                className="flex flex-col items-center justify-center p-2 dark:text-slate-400 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-5 w-5 mb-1" />
                <span className="text-xs font-bold">Избриши</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Edit Modal */}
      {editModalQuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center dark:bg-slate-950 bg-slate-100/80 backdrop-blur-sm p-4">
           <div className="dark:bg-slate-900 bg-white rounded-2xl w-full max-w-lg shadow-2xl border dark:border-slate-700 border-slate-200 overflow-hidden flex flex-col">
             <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 border-slate-200">
                <h3 className="text-xl font-bold dark:text-slate-100 text-slate-900">Брзо Уредување</h3>
                <button type="button" aria-label="Затвори" onClick={() => setEditModalQuest(null)} className="dark:text-slate-400 text-slate-600 hover:dark:text-slate-200 text-slate-800 dark:bg-slate-800 bg-slate-50 hover:bg-slate-700 p-2 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold dark:text-slate-400 text-slate-600 mb-2">Наслов на авантурата</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl px-4 py-3 dark:text-slate-100 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold dark:text-slate-400 text-slate-600 mb-2">Опис</label>
                  <textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl px-4 py-3 dark:text-slate-100 text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
             </div>
             <div className="p-6 dark:bg-slate-900 bg-white/50 border-t dark:border-slate-800 border-slate-200 flex gap-4">
                <button 
                  onClick={() => setEditModalQuest(null)}
                  className="flex-1 py-3 dark:bg-slate-800 bg-slate-50 hover:bg-slate-700 dark:text-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Откажи
                </button>
                <button 
                  onClick={handleEditSave}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> Зачувај
                </button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
