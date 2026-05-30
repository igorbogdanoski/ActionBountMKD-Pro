import { ReactNode, useEffect, useState } from 'react';
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
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 flex flex-col relative w-full h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
