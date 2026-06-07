import { Link } from 'react-router-dom';
import { Mail, MapPin, Globe } from 'lucide-react';

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="bg-[#2a2522] text-slate-300 border-t border-white/10">

      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-3">
          <span className="text-3xl text-brand-500 font-cursive">Авантура</span>
          <p className="text-sm text-slate-400 leading-relaxed">
            Македонска платформа за интерактивни GPS авантури, едукативни квестови и
            теренска настава. Претвори го светот во училница во живо.
          </p>
        </div>

        {/* Platform */}
        <nav className="space-y-3" aria-label="Платформа">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Платформа</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/explore" className="hover:text-brand-500 transition-colors">Истражи авантури</Link></li>
            <li><Link to="/creator" className="hover:text-brand-500 transition-colors">Креирај авантура</Link></li>
            <li><Link to="/pricing" className="hover:text-brand-500 transition-colors">Цени и планови</Link></li>
            <li><Link to="/join" className="hover:text-brand-500 transition-colors">Приклучи се на сесија</Link></li>
          </ul>
        </nav>

        {/* Legal */}
        <nav className="space-y-3" aria-label="Правни информации">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Правни</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-brand-500 transition-colors">Политика на приватност</Link></li>
            <li><Link to="/terms" className="hover:text-brand-500 transition-colors">Услови на користење</Link></li>
          </ul>
        </nav>

        {/* Contact */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Контакт</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="mailto:igor.bogdanoski@mismath.net" className="flex items-center gap-2 hover:text-brand-500 transition-colors">
                <Mail className="w-4 h-4 text-brand-500" /> igor.bogdanoski@mismath.net
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-500" /> avantura.mismath.net
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <MapPin className="w-4 h-4 text-brand-500" /> Северна Македонија
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {YEAR} Авантура. Сите права задржани.</p>
          <p>Создадено за наставници, ученици и истражувачи 🧭</p>
        </div>
      </div>
    </footer>
  );
}
