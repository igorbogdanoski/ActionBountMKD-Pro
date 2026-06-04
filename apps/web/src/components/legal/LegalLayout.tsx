import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '../SEO';
import { Footer } from '../layout/Footer';

interface Props {
  title: string;
  url: string;
  updated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, url, updated, children }: Props) {
  return (
    <>
      <SEO title={title} url={url} />
      <div className="min-h-screen bg-[#e8eedd] text-slate-800 flex flex-col">

        <header className="bg-[#2a2522] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="text-2xl text-[#e66c4f] font-cursive">Авантура</Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-[#e66c4f] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Почетна
          </Link>
        </header>

        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-14">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">{title}</h1>
            <p className="text-sm text-slate-500 mb-10">Последно ажурирање: {updated}</p>
            <div className="space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-2 [&_p]:text-slate-700 [&_p]:leading-relaxed [&_li]:text-slate-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-[#e66c4f] [&_a]:underline">
              {children}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
