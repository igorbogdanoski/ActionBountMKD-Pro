import { ReactNode, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar, CurrentView } from './Sidebar';
import { getUserTheme, saveUserTheme } from '../../utils/storage';
import { useAuth } from '../../utils/AuthContext';

interface DashboardLayoutProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  children: ReactNode;
}

export function DashboardLayout({ currentView, onNavigate, children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserTheme(user.uid).then(theme => {
      const isDark = theme !== 'light';
      setIsDarkTheme(isDark);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    });
  }, [user]);

  const toggleTheme = () => {
    const newDark = !isDarkTheme;
    setIsDarkTheme(newDark);
    if (newDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (user) saveUserTheme(user.uid, newDark ? 'dark' : 'light');
  };

  const handleNavigate = (view: CurrentView) => {
    onNavigate(view);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen dark:bg-slate-900 bg-slate-50 font-sans dark:text-slate-200 text-slate-800 overflow-hidden relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown as drawer when open */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:flex md:shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isDarkTheme={isDarkTheme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <main className="flex-1 flex flex-col relative w-full h-full overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Отвори мени"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-base tracking-tight">АВАНТУРА</span>
        </div>
        {children}
      </main>
    </div>
  );
}
