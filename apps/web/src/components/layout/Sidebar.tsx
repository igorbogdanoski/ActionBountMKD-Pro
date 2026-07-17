import { Map, PlusCircle, Settings, BarChart3, HelpCircle, LogOut, BookOpen, Zap, Crown, Sun, Moon, Shield, GraduationCap, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { LANGUAGES, type SupportedLang } from '../../i18n';
import { Button } from '../ui/Button';

export type CurrentView = 'dashboard' | 'creator' | 'results' | 'templates' | 'groups' | 'settings';

interface SidebarProps {
  currentView: CurrentView;
  onNavigate: (view: CurrentView) => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
}

const NAV_ITEM_IDS = ['dashboard', 'creator', 'templates', 'groups', 'results', 'settings'] as const;
const NAV_ICONS: Record<string, React.ElementType> = {
  dashboard: Map, creator: PlusCircle, templates: BookOpen, groups: GraduationCap, results: BarChart3, settings: Settings,
};

export function Sidebar({ currentView, onNavigate, isDarkTheme = true, onToggleTheme }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const { planId, limits } = usePlan();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const switchLang = (code: SupportedLang) => i18n.changeLanguage(code);
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
        <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest px-3 mb-3">
          {t('nav.myAdventures').split(' ')[0]}
        </p>
        <nav className="space-y-1">
          {NAV_ITEM_IDS.map((id) => {
            const Icon = NAV_ICONS[id];
            const active = currentView === id;
            return (
              <Button
                key={id}
                type="button"
                onClick={() => onNavigate(id as Parameters<typeof onNavigate>[0])}
                fullWidth
                aria-current={active ? 'page' : undefined}
                colorClassName={active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 focus-visible:ring-indigo-400'
                  : 'text-indigo-200 hover:bg-indigo-900/60 hover:text-white focus-visible:ring-indigo-400'}
                className="!justify-start !gap-3 !rounded-lg !px-3 !py-2.5 !font-medium duration-150"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t(`nav.${id}` as Parameters<typeof t>[0])}
              </Button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="p-4 border-t border-indigo-900/60 space-y-3">

        {/* Language switcher + theme toggle */}
        <div className="flex gap-1.5">
          {LANGUAGES.map(lang => (
            <Button
              key={lang.code}
              type="button"
              onClick={() => switchLang(lang.code)}
              title={lang.label}
              aria-pressed={i18n.language === lang.code}
              size="sm"
              colorClassName={i18n.language === lang.code
                ? 'bg-indigo-600 text-white focus-visible:ring-indigo-400'
                : 'bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/70 hover:text-white focus-visible:ring-indigo-400'}
              className="flex-1 !px-1 !py-1.5"
            >
              {lang.flag} {lang.code.toUpperCase()}
            </Button>
          ))}
          {onToggleTheme && (
            <Button
              type="button"
              onClick={onToggleTheme}
              title="Смени тема"
              aria-label="Смени тема"
              size="icon"
              colorClassName="bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900/70 hover:text-white focus-visible:ring-indigo-400"
              className="!px-2.5 !py-1.5 shrink-0"
            >
              {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Plan card */}
        <div className="bg-indigo-900/50 rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-white">{t(`plan.${planId}` as Parameters<typeof t>[0])}</span>
            </div>
            {planId === 'free' && (
              <Button
                type="button"
                onClick={() => navigate('/pricing')}
                variant="ghost"
                colorClassName="text-indigo-300 hover:text-white focus-visible:ring-indigo-400"
                className="!p-0 !gap-1 !text-[10px]"
              >
                <Zap className="w-3 h-3" /> {t('plan.upgrade')}
              </Button>
            )}
          </div>
          {!isEnterprise && (
            <p className="text-[11px] text-indigo-300">
              {t('plan.adventuresLimit', { max: maxQuests })}
            </p>
          )}
          {isEnterprise && (
            <p className="text-[11px] text-indigo-300">{t('plan.unlimited')}</p>
          )}
        </div>

        {/* User email */}
        {user && (
          <div className="px-3 py-2 bg-indigo-900/30 rounded-lg">
            <p className="text-[11px] text-indigo-300 truncate">{user.email}</p>
          </div>
        )}

        {/* Admin link — only for admin users */}
        {isAdmin && (
          <Button
            type="button"
            onClick={() => navigate('/admin')}
            fullWidth
            colorClassName="text-indigo-300 hover:bg-indigo-900/60 hover:text-white focus-visible:ring-indigo-400"
            className="!justify-start !gap-3 !rounded-lg !px-3 !py-2 !font-medium"
          >
            <Shield className="h-4 w-4 shrink-0 text-indigo-400" />
            Admin панел
          </Button>
        )}

        {/* Help & Logout */}
        <div className="space-y-1">
          <Button
            type="button"
            onClick={() => navigate('/explore')}
            fullWidth
            colorClassName="text-indigo-200 hover:bg-indigo-900/60 hover:text-white focus-visible:ring-indigo-400"
            className="!justify-start !gap-3 !rounded-lg !px-3 !py-2 !font-medium"
          >
            <Compass className="h-4 w-4 shrink-0" />
            {t('nav.explore')}
          </Button>
          <a
            href="mailto:igor.bogdanoski@mismath.net"
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-900/60 hover:text-white transition-colors"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            {t('nav.help')}
          </a>
          <Button
            type="button"
            onClick={logout}
            fullWidth
            colorClassName="text-red-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-red-400"
            className="!justify-start !gap-3 !rounded-lg !px-3 !py-2 !font-medium"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t('nav.logout')}
          </Button>
        </div>
      </div>
    </aside>
  );
}
