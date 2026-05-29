import { Map, PlusCircle, Settings, BarChart3, HelpCircle, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';

export type CurrentView = 'dashboard' | 'creator' | 'results' | 'templates' | 'settings';

interface SidebarProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  
  const navigation = [
    { id: 'dashboard', name: 'Мои Авантури', icon: Map },
    { id: 'creator', name: 'Креирај Авантура', icon: PlusCircle },
    { id: 'templates', name: 'Библиотека', icon: BookOpen },
    { id: 'results', name: 'Резултати', icon: BarChart3 },
    { id: 'settings', name: 'Поставки', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-indigo-950 dark:text-slate-300 text-slate-800 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-indigo-900">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center dark:text-white text-black shadow-lg shadow-emerald-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <span className="font-bold text-xl tracking-tight dark:text-white text-black">АВАНТУРА</span>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-6">
        <nav className="flex-1 space-y-2 px-4">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest px-3 mb-2">ГЛАВНО</div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-indigo-900/50 dark:text-white text-black'
                    : 'dark:text-slate-300 text-slate-800 hover:bg-indigo-900/30'
                }`}
              >
                <Icon
                  className="mr-3 h-5 w-5 shrink-0 transition-colors"
                  aria-hidden="true"
                />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-indigo-900/50">
        <div className="bg-indigo-900/40 rounded-xl p-4 mb-4">
          <p className="text-xs text-indigo-300 mb-2">Про план</p>
          <div className="w-full bg-indigo-950 h-1.5 rounded-full mb-2">
            <div className="bg-amber-400 h-full w-3/4 rounded-full"></div>
          </div>
          <p className="text-[10px]">75% искористен простор</p>
        </div>
        <div className="space-y-1">
          {user && (
            <div className="px-3 py-2 mb-2 bg-indigo-900/20 rounded-lg">
              <span className="text-xs text-indigo-300 truncate block">{user.email}</span>
            </div>
          )}
          <button className="w-full group flex items-center rounded-lg px-3 py-2 text-sm font-medium dark:text-slate-300 text-slate-800 hover:bg-indigo-900/30">
            <HelpCircle className="mr-3 h-5 w-5" />
            Помош
          </button>
          <button onClick={logout} className="w-full group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10">
            <LogOut className="mr-3 h-5 w-5" />
            Одјави се
          </button>
        </div>
      </div>
    </aside>
  );
}
