import { ReactNode, useEffect, useState } from 'react';
import { Sidebar, CurrentView } from './Sidebar';
import { Sun, Moon } from 'lucide-react';
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

  return (
    <div className="flex h-screen dark:bg-slate-900 bg-slate-50 font-sans dark:text-slate-200 text-slate-800 overflow-hidden relative">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col relative w-full h-full overflow-y-auto">
        {/* Global theme toggle button */}
        <button 
          onClick={toggleTheme}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-xl dark:bg-slate-800 bg-white shadow-sm dark:text-yellow-400 text-slate-500 hover:scale-105 transition-all outline-none border dark:border-slate-700 border-slate-200"
          title="Смени тема"
        >
          {isDarkTheme ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {children}
      </main>
    </div>
  );
}
