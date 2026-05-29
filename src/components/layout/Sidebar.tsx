import { Map, PlusCircle, Settings, BarChart3, HelpCircle, LogOut, BookOpen, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { PLAN_LIMITS } from '../../types';

export type CurrentView = 'dashboard' | 'creator' | 'results' | 'templates' | 'settings';

interface SidebarProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard',  name: 'Мои Авантури',    icon: Map },
  { id: 'creator',    name: 'Креирај Авантура', icon: PlusCircle },
  { id: 'templates',  name: 'Библиотека',       icon: BookOpen },
  { id: 'results',    name: 'Резултати',        icon: BarChart3 },
  { id: 'settings',   name: 'Поставки',         icon: Settings },
] as const;

const PLAN_LABELS: Record<string, string> = {
  free:       'Бесплатен',
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-400',
  starter:    'bg-indigo-400',
  pro:        'bg-emerald-400',
  enterprise: 'bg-amber-400',
};

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { planId, limits } = usePlan();
  const navigate = useNavigate();

  // We don't have real quest count here — show static bar for now,
  // will be wired to real count in BoundsDashboard via context in Phase 3
  const maxQuests = limits.maxQuests === -1 ? '∞' : limits.maxQuests;
  const isEnterprise = planId === 'enterprise';

  return (
    <aside className="w-64 bg-indigo-950 flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-indigo-900/60">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <span className="font-bold text-xl tracking-tight text-white">АВАНТУРА</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto pt-5 px-3">
        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest px-3 mb-3">Главно</p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ id, name, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="p-4 border-t border-indigo-900/60 space-y-3">

        {/* Plan card */}
        <div className="bg-indigo-900/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-white">{PLAN_LABELS[planId]}</span>
            </div>
            {planId === 'free' && (
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="text-[10px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3 h-3" /> Надгради
              </button>
            )}
          </div>
          {!isEnterprise && (
            <p className="text-[11px] text-indigo-300">
              До <span className="text-white font-semibold">{maxQuests}</span> авантури
            </p>
          )}
          {isEnterprise && (
            <p className="text-[11px] text-indigo-300">Неограничено</p>
          )}
        </div>

        {/* User email */}
        {user && (
          <div className="px-3 py-2 bg-indigo-900/30 rounded-lg">
            <p className="text-[11px] text-indigo-300 truncate">{user.email}</p>
          </div>
        )}

        {/* Help & Logout */}
        <div className="space-y-1">
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-900/60 hover:text-white transition-colors"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            Помош
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Одјави се
          </button>
        </div>
      </div>
    </aside>
  );
}
