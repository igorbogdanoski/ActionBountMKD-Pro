import { Map, QrCode, Target, Users, MapPin, Trophy, Navigation, Smartphone, WifiOff, MessageSquare, Clock, ArrowRight, Play, PenTool } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SEO, SoftwareAppSchema } from '../SEO';

const ROTATING_TEXTS = [
  "Креативна едукативна апликација",
  "Интерактивен мобилен водич",
  "Дигитален лов на богатство",
  "Развивање математичко моделирање",
  "Теренска настава на ново ниво"
];

export function LandingPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const onNavigateToCreator = () => navigate('/creator');
  const onNavigateToPlayerDemo = () => navigate('/play/demo-quest-123');
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SEO url="/" />
      <SoftwareAppSchema />
      <div className="min-h-screen bg-[#e8eedd] font-sans text-slate-800 flex flex-col overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');
        .font-cursive { font-family: 'Pacifico', cursive; }
      `}</style>
      
      {/* Header */}
      <header className="bg-[#2a2522] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#e66c4f] font-cursive pt-1">Авантура</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <button onClick={onNavigateToPlayerDemo} className="hover:text-[#e66c4f] transition-colors">Играј Авантура</button>
            <button onClick={onNavigateToCreator} className="hover:text-[#e66c4f] transition-colors">Креирај Авантура</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
             <button onClick={onNavigateToCreator} className="border border-[#e66c4f] text-[#e66c4f] hover:bg-[#e66c4f] hover:text-white px-4 py-1.5 rounded-full text-sm font-bold transition-colors">
               Контролна Табла
             </button>
          ) : (
             <>
               <button onClick={signInWithGoogle} className="hidden md:block text-sm font-medium hover:text-[#e66c4f] transition-colors">Најава</button>
               <button onClick={onNavigateToCreator} className="border border-[#e66c4f] text-[#e66c4f] hover:bg-[#e66c4f] hover:text-white px-4 py-1.5 rounded-full text-sm font-bold transition-colors">
                 Бесплатен тест
               </button>
             </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[#2a2522] text-white overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at center, #3d322c 0%, #2a2522 100%)' }}>
        {/* Background bokeh effect placeholder */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500 rounded-full mix-blend-screen filter blur-[80px]"></div>
           <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#e66c4f] rounded-full mix-blend-screen filter blur-[100px]"></div>
        </div>
        
        <div className="relative z-20 max-w-5xl mx-auto px-6 py-24 md:py-36 flex flex-col items-center text-center h-[50vh] min-h-[400px] justify-center">
          
          <div className="absolute left-10 md:left-20 top-1/4 animate-bounce z-30 hidden md:block" style={{ animationDuration: '3s' }}>
             <div className="bg-white rounded-full p-2 shadow-2xl relative w-32 h-32 flex items-center justify-center -rotate-12 border-4 border-white">
                <span className="absolute -top-3 -rotate-6 text-[10px] font-black uppercase text-black">Get in touch!</span>
                <div className="bg-slate-200 w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                   <Users className="w-12 h-12 text-slate-400" />
                </div>
                <span className="absolute -bottom-2 text-2xl font-cursive text-black pt-1">А</span>
             </div>
          </div>

          <h1 className="text-7xl md:text-[8rem] text-[#e66c4f] font-cursive drop-shadow-md mb-8 tracking-wide transform -rotate-1">
            Авантура
          </h1>
          
          <div className="h-20 flex items-center justify-center w-full relative">
            <AnimatePresence mode="popLayout">
              <motion.p
                key={textIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute w-full text-2xl md:text-5xl font-light text-slate-200 text-center"
              >
                {ROTATING_TEXTS[textIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Sub-hero Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-light text-slate-700 mb-16 max-w-4xl mx-auto leading-tight">
          Креирајте мобилни авантури и интерактивни водичи за паметни телефони и таблети
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <div className="bg-white p-4 rounded-xl shadow-xl border-4 border-slate-800 w-full max-w-sm relative cursor-pointer hover:scale-105 transition-transform" onClick={onNavigateToCreator}>
            <div className="aspect-[4/3] bg-slate-100 rounded flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-indigo-900/10"></div>
               <PenTool className="w-16 h-16 text-indigo-600 mb-4" />
               <span className="absolute bottom-4 font-bold text-indigo-900">Креатор на Авантури</span>
            </div>
          </div>

          <ArrowRight className="hidden md:block w-12 h-12 text-slate-400" />

          <div className="bg-white p-4 rounded-3xl shadow-xl w-full max-w-[240px] border-8 border-slate-800 relative cursor-pointer hover:scale-105 transition-transform" onClick={onNavigateToPlayerDemo}>
            <div className="aspect-[9/19] bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-emerald-900/10"></div>
               <Smartphone className="w-12 h-12 text-emerald-600 mb-4" />
               <span className="absolute bottom-8 font-bold text-emerald-900 text-center px-4">Мобилен Играч<br/><span className="text-xs text-emerald-600 font-normal">Скенирај и играј</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#dbe3cc] px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-light text-center text-slate-700 mb-16">Преполно со функционалности</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
            <Feature icon={Target} label="Квиз" />
            <Feature icon={MapPin} label="GPS Локации" />
            <Feature icon={Trophy} label="Награди" />
            <Feature icon={MessageSquare} label="Анкети" />
            
            <Feature icon={Map} label="Мисии" />
            <Feature icon={Navigation} label="Водич" />
            <Feature icon={StarIcon} label="Поени" />
            <Feature icon={BarChartIcon} label="Евалуација" />
            
            <Feature icon={Users} label="Турнири" />
            <Feature icon={Map} label="Мапи" />
            <Feature icon={Clock} label="Тајмер" />
            <Feature icon={MessageSquare} label="Повратни Информации" />
            
            <Feature icon={QrCode} label="QR Кодови" />
            <Feature icon={CompassIcon} label="Компас" />
            <Feature icon={CheckCircleIcon} label="Напредок" />
            <Feature icon={ShareIcon} label="Споделување" />
          </div>
        </div>
      </section>

      {/* Flexible Section */}
      <section className="py-20 bg-[#d1dac0] px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-light text-center text-slate-700 mb-16">Флексибилно</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-8">
            <Feature icon={BuildingIcon} label="Урбани средини" />
            <Feature icon={HomeIcon} label="Внатре (Indoors)" />
            <Feature icon={UserIcon} label="Еден играч" />
            <Feature icon={WifiOff} label="Офлајн режим" />
            <Feature icon={TreeIcon} label="Рурални средини" />
            <Feature icon={WalkIcon} label="На отворено" />
            <Feature icon={Users} label="Групи и тимови" />
            <Feature icon={GlobeIcon} label="Повеќе јазици" />
          </div>
        </div>
      </section>
    </div>
    </>
  );
}

function Feature({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <div className="flex items-center gap-4 text-slate-700">
      <Icon className="w-6 h-6 text-slate-800" />
      <span className="text-lg font-light">{label}</span>
    </div>
  );
}

// Simple placeholder icons to match the design
const StarIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const BarChartIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const CompassIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
const CheckCircleIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const ShareIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const BuildingIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M4 22h16M4 22V2h16v20M8 6h8M8 10h8M8 14h8M8 18h8"/></svg>;
const HomeIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const UserIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const TreeIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 22V15M10 15h4M12 2L8 8h3l-2 4h6l-2-4h3z"/></svg>;
const WalkIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M10.5 18 l-1 5 M13 14 l2 9 M13 14 v-5 1.5 -2.5 M9 8.5 l1.5 2.5 2 -1.5 M16 9.5 l-2 1"/></svg>;
const GlobeIcon = (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
