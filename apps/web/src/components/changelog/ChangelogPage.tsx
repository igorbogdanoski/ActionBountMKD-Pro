import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from '../layout/Footer';
import { SEO } from '../SEO';
import { Card } from '../ui/Card';

interface Release {
  date: string;
  title: string;
  summary: string;
  changes: string[];
}

const RELEASES: Release[] = [
  {
    date: '23 јули 2026',
    title: 'Подоследно и попристапно искуство',
    summary: 'Ги усогласивме клучните екрани и состојби низ платформата.',
    changes: [
      'Подобрена пристапност на копчињата, дијалозите и интерактивните контроли.',
      'Појасни состојби за вчитување, грешки и повторен обид.',
      'Усогласен изглед на информативните картички на мобилен и десктоп.',
    ],
  },
  {
    date: '18 јули 2026',
    title: 'Посигурни авантури во живо',
    summary: 'Наставниците и играчите добија постабилни контроли за сесии во живо.',
    changes: [
      'Побезбедно започнување, завршување и бришење на сесија со потврда.',
      'Подобрени GPS, QR и offline состојби со видливи пораки за грешка.',
      'Подобра поддршка за турнир, жива мапа и SOS повици.',
    ],
  },
  {
    date: '2 јуни 2026',
    title: 'Јавни авантури и планови',
    summary: 'Нови начини за откривање, споделување и управување со авантури.',
    changes: [
      'Јавна библиотека за истражување авантури.',
      'Поддршка за планови, лимити и барања за плаќање.',
      'Подобрени резултати, извештаи и наставничко оценување.',
    ],
  },
];

export function ChangelogPage() {
  return (
    <>
      <SEO
        title="Новости"
        description="Најнови подобрувања, функции и промени во платформата Авантура."
        url="/changelog"
        type="article"
      />
      <div className="min-h-screen bg-[#e8eedd] text-slate-800 flex flex-col">
        <header className="bg-[#2a2522] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="text-2xl text-brand-500 font-cursive">Авантура</Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-brand-500 transition-colors">
            <ArrowLeft aria-hidden="true" className="w-4 h-4" /> Почетна
          </Link>
        </header>

        <main className="flex-1">
          <section className="max-w-3xl mx-auto px-6 py-14" aria-labelledby="changelog-title">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-sm font-bold mb-4">
              <Sparkles aria-hidden="true" className="w-4 h-4" />
              Што е ново
            </div>
            <h1 id="changelog-title" className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Новости во Авантура
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-10">
              Следете ги новите функции, подобрувањата и поправките што го прават учењето преку авантури
              поедноставно и посигурно.
            </p>

            <div className="space-y-6">
              {RELEASES.map((release, index) => (
                <article key={release.date} aria-labelledby={`release-${index}`}>
                  <Card className="!bg-white !border-slate-200 !shadow-sm p-6">
                    <time className="text-sm font-bold text-brand-600">{release.date}</time>
                    <h2 id={`release-${index}`} className="text-2xl font-extrabold text-slate-900 mt-1 mb-2">
                      {release.title}
                    </h2>
                    <p className="text-slate-600 mb-4">{release.summary}</p>
                    <ul className="space-y-2">
                      {release.changes.map(change => (
                        <li key={change} className="flex items-start gap-2 text-slate-700">
                          <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </article>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
