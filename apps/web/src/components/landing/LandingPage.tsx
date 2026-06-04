import { Map, QrCode, Target, Users, MapPin, Trophy, Navigation, Smartphone, WifiOff, MessageSquare, Clock, Play, PenTool, Sparkles, GraduationCap, Landmark, Share2, Heart, Puzzle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { SEO, SoftwareAppSchema, FaqSchema } from '../SEO';
import { Footer } from '../layout/Footer';
import { LANGUAGES, type SupportedLang } from '../../i18n';
import { DEMO_QUEST_ID } from '../../data/demoQuest';

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

const STEP_NUMBERS = ['01', '02', '03'] as const;
const STEP_ICONS = [MapPin, Puzzle, Share2] as const;
const AUDIENCE_ICONS = [GraduationCap, Heart, Landmark] as const;

const FEATURE_ICONS = [
  Target, MapPin, Trophy, MessageSquare,
  Map, Navigation, StarIcon, BarChartIcon,
  Users, Map, Clock, MessageSquare,
  QrCode, CompassIcon, CheckCircleIcon, ShareIcon,
] as const;

const FLEX_ICONS = [
  BuildingIcon, HomeIcon, UserIcon, WifiOff,
  TreeIcon, WalkIcon, Users, GlobeIcon,
] as const;

interface TestimonialItem { quote: string; name: string; role: string; initial: string; }
interface TitleText { title: string; text: string; }
interface FaqEntry { q: string; a: string; }

export function LandingPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const onNavigateToCreator = () => navigate('/creator');
  const onNavigateToPlayerDemo = () => navigate(`/play/${DEMO_QUEST_ID}`);
  const scrollToHowItWorks = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  const switchLang = (code: SupportedLang) => i18n.changeLanguage(code);
  const [textIndex, setTextIndex] = useState(0);

  const rotating = t('landing.hero.rotating', { returnObjects: true }) as string[];
  const steps = t('landing.how.steps', { returnObjects: true }) as TitleText[];
  const audiences = t('landing.audience.items', { returnObjects: true }) as TitleText[];
  const testimonials = t('landing.testimonials.items', { returnObjects: true }) as TestimonialItem[];
  const featureLabels = t('landing.features.labels', { returnObjects: true }) as string[];
  const flexLabels = t('landing.features.flexLabels', { returnObjects: true }) as string[];
  const faqItems = t('landing.faq.items', { returnObjects: true }) as FaqEntry[];

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % rotating.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [rotating.length]);

  return (
    <>
      <SEO url="/" />
      <SoftwareAppSchema />
      <FaqSchema items={faqItems} />
      <div className="min-h-screen bg-[#e8eedd] font-sans text-slate-800 flex flex-col overflow-y-auto">

      {/* Header */}
      <header className="bg-[#2a2522] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#e66c4f] font-cursive pt-1">Авантура</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <button onClick={onNavigateToPlayerDemo} className="hover:text-[#e66c4f] transition-colors">{t('landing.nav.play')}</button>
            <button onClick={onNavigateToCreator} className="hover:text-[#e66c4f] transition-colors">{t('landing.nav.create')}</button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" role="group" aria-label="Language">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => switchLang(lang.code)}
                aria-pressed={i18n.language === lang.code}
                title={lang.label}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-[#e66c4f] text-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
          {user ? (
             <button onClick={onNavigateToCreator} className="border border-[#e66c4f] text-[#e66c4f] hover:bg-[#e66c4f] hover:text-white px-4 py-1.5 rounded-full text-sm font-bold transition-colors">
               {t('landing.nav.dashboard')}
             </button>
          ) : (
             <>
               <button onClick={signInWithGoogle} className="hidden md:block text-sm font-medium hover:text-[#e66c4f] transition-colors">{t('landing.nav.login')}</button>
               <button onClick={onNavigateToCreator} className="border border-[#e66c4f] text-[#e66c4f] hover:bg-[#e66c4f] hover:text-white px-4 py-1.5 rounded-full text-sm font-bold transition-colors">
                 {t('landing.nav.freeTest')}
               </button>
             </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[#2a2522] text-white overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at center, #3d322c 0%, #2a2522 100%)' }}>
        {/* Background bokeh effect */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500 rounded-full mix-blend-screen filter blur-[80px]"></div>
           <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#e66c4f] rounded-full mix-blend-screen filter blur-[100px]"></div>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* LEFT: Value proposition */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="lg:col-span-7 text-center lg:text-left space-y-6"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#e66c4f]/15 text-[#e66c4f] tracking-wide uppercase border border-[#e66c4f]/30">
              <Sparkles className="w-3.5 h-3.5" /> {t('landing.hero.badge')}
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              {t('landing.hero.titlePre')}{' '}
              <span className="font-cursive text-[#e66c4f] font-normal pr-1">{t('landing.hero.titleHighlight')}</span>
            </h1>

            <div className="h-9 relative">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={textIndex}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="absolute w-full text-base md:text-lg font-semibold text-amber-300/90 text-center lg:text-left"
                >
                  {rotating[textIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t('landing.hero.lead')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={user ? onNavigateToCreator : signInWithGoogle}
                className="w-full sm:w-auto px-8 py-4 text-white bg-[#e66c4f] hover:bg-[#d65b3f] font-bold rounded-xl shadow-lg hover:shadow-[#e66c4f]/30 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {t('landing.hero.ctaPrimary')}
              </button>
              <button
                onClick={scrollToHowItWorks}
                className="w-full sm:w-auto px-8 py-4 text-white bg-white/5 hover:bg-white/10 font-semibold rounded-xl border border-white/15 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 text-[#e66c4f]" />
                {t('landing.hero.ctaSecondary')}
              </button>
            </div>

            {/* Social proof */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-3 text-xs text-slate-400">
              <div className="flex -space-x-2">
                <span className="w-6 h-6 rounded-full bg-[#e66c4f] border-2 border-[#2a2522] flex items-center justify-center text-[10px] text-white font-bold">М</span>
                <span className="w-6 h-6 rounded-full bg-amber-500 border-2 border-[#2a2522] flex items-center justify-center text-[10px] text-white font-bold">Е</span>
                <span className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#2a2522] flex items-center justify-center text-[10px] text-white font-bold">Т</span>
              </div>
              <span>{t('landing.hero.socialProof')}</span>
            </div>
          </motion.div>

          {/* RIGHT: Interactive phone mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="lg:col-span-5 flex justify-center"
          >
            <div className="relative w-[280px] h-[560px] bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-28 bg-slate-900 rounded-b-2xl z-30"></div>

              <div className="relative w-full h-full bg-white rounded-[32px] overflow-hidden flex flex-col justify-between p-4 select-none">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-slate-400">{t('landing.hero.phone.route')}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">{t('landing.hero.phone.points')}</span>
                </div>

                {/* Simulated map */}
                <div className="my-3 bg-slate-50 rounded-2xl p-3 border border-slate-100 relative overflow-hidden h-56">
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-60"></div>
                  <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-10">
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-[#e66c4f] opacity-75 animate-ping"></span>
                    <div className="relative bg-[#e66c4f] text-white p-2 rounded-full shadow-lg">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200/60 z-20">
                    <p className="text-[11px] font-bold text-slate-800">{t('landing.hero.phone.nextStation')}</p>
                    <p className="text-[9px] text-slate-500">{t('landing.hero.phone.accuracy')}</p>
                  </div>
                </div>

                {/* Current task */}
                <div className="space-y-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <h4 className="text-xs font-bold text-[#2a2522]">{t('landing.hero.phone.riddleTitle')}</h4>
                  <p className="text-[11px] text-slate-700 leading-normal">
                    {t('landing.hero.phone.riddleText')}
                  </p>
                  <input type="text" placeholder={t('landing.hero.phone.inputPlaceholder')} disabled className="w-full text-[10px] p-2 rounded-md border border-slate-200 bg-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works — Три чекори */}
      <section id="how-it-works" className="py-20 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-slate-700 mb-4">{t('landing.how.title')}</h2>
          <p className="text-center text-slate-500 mb-14 max-w-2xl mx-auto">{t('landing.how.subtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Step key={i} number={STEP_NUMBERS[i]} icon={STEP_ICONS[i]} title={step.title} text={step.text} />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14">
            <button onClick={onNavigateToCreator} className="px-7 py-3.5 bg-[#2a2522] text-white font-bold rounded-xl hover:bg-[#3d322c] transition-colors flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#e66c4f]" /> {t('landing.how.ctaCreate')}
            </button>
            <button onClick={onNavigateToPlayerDemo} className="px-7 py-3.5 bg-white text-slate-700 font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" /> {t('landing.how.ctaDemo')}
            </button>
          </div>
        </div>
      </section>

      {/* За кого е ова */}
      <section className="py-20 px-6 bg-[#dbe3cc]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-slate-700 mb-14">{t('landing.audience.title')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audiences.map((item, i) => (
              <Audience key={i} icon={AUDIENCE_ICONS[i]} title={item.title} text={item.text} />
            ))}
          </div>
        </div>
      </section>

      {/* Social proof — изјави */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-slate-700 mb-4">{t('landing.testimonials.title')}</h2>
          <p className="text-center text-slate-500 mb-14 max-w-2xl mx-auto">{t('landing.testimonials.subtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((item, i) => (
              <Testimonial key={i} quote={item.quote} name={item.name} role={item.role} initial={item.initial} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#dbe3cc] px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-light text-center text-slate-700 mb-16">{t('landing.features.title')}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-12 gap-x-4 md:gap-x-8">
            {featureLabels.map((label, i) => (
              <Feature key={i} icon={FEATURE_ICONS[i]} label={label} />
            ))}
          </div>
        </div>
      </section>

      {/* Flexible Section */}
      <section className="py-20 bg-[#d1dac0] px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-light text-center text-slate-700 mb-16">{t('landing.features.flexTitle')}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 md:gap-y-10 gap-x-4 md:gap-x-8">
            {flexLabels.map((label, i) => (
              <Feature key={i} icon={FLEX_ICONS[i]} label={label} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center text-slate-700 mb-12">{t('landing.faq.title')}</h2>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-[#2a2522] text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold">{t('landing.finalCta.title')}</h2>
          <p className="text-slate-300">{t('landing.finalCta.subtitle')}</p>
          <button
            onClick={user ? onNavigateToCreator : signInWithGoogle}
            className="px-8 py-4 bg-[#e66c4f] hover:bg-[#d65b3f] text-white font-bold rounded-xl shadow-lg transition-colors"
          >
            {t('landing.finalCta.button')}
          </button>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}

function Testimonial({ quote, name, role, initial }: { quote: string, name: string, role: string, initial: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 flex flex-col">
      <div className="text-[#e66c4f] text-5xl font-cursive leading-none mb-2">“</div>
      <p className="text-sm text-slate-600 leading-relaxed flex-1">{quote}</p>
      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
        <span className="w-10 h-10 rounded-full bg-[#2a2522] text-[#e66c4f] flex items-center justify-center font-bold">{initial}</span>
        <div>
          <p className="text-sm font-bold text-slate-800">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-semibold text-slate-800">{q}</span>
        <ChevronDown className={`w-5 h-5 text-[#e66c4f] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-sm text-slate-600 leading-relaxed">{a}</div>
      )}
    </div>
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

function Step({ number, icon: Icon, title, text }: { number: string, icon: any, title: string, text: string }) {
  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center md:text-left">
      <span className="absolute -top-4 right-5 text-5xl font-extrabold text-[#e66c4f]/15 select-none">{number}</span>
      <div className="w-12 h-12 rounded-xl bg-[#e66c4f]/10 flex items-center justify-center mb-4 mx-auto md:mx-0">
        <Icon className="w-6 h-6 text-[#e66c4f]" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
    </div>
  );
}

function Audience({ icon: Icon, title, text }: { icon: any, title: string, text: string }) {
  return (
    <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-200/60 hover:-translate-y-1 transition-transform">
      <div className="w-14 h-14 rounded-2xl bg-[#2a2522] flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-[#e66c4f]" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  );
}

