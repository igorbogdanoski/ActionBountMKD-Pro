import { useState, useEffect } from 'react';
import { Search, Map as MapIcon, Lock, Users, Clock, Compass, BookOpen, Star, FileText, Heart, X, Play } from 'lucide-react';

export function TemplatesLibrary({ onUseTemplate }: { onUseTemplate: (template: any) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Сите');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  useEffect(() => {
    const savedFavs = localStorage.getItem('actionbound_fav_templates');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavs = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('actionbound_fav_templates', JSON.stringify(newFavs));
  };

  const categories = ['Сите', 'Омилени', 'Математика', 'Природни науки', 'Јазици', 'Историја', 'Физичко'];

  const templates = [
    {
      id: 'math-1',
      title: 'Синтетичка геометрија во реалниот простор',
      subject: 'Математика',
      grade: '8 одд.',
      description: 'Учениците наоѓаат агли и пресметуваат симетрали користејќи објекти во природата. Идеално за училишен двор.',
      stages: 5,
      rating: 4.8
    },
    {
      id: 'math-2',
      title: 'Процентополис - City Quests',
      subject: 'Математика',
      grade: '7 одд.',
      description: 'Мрежа од скриени QR кодови низ училиштето. Секој код активира задача за математичко моделирање и проценти.',
      stages: 8,
      rating: 4.9
    },
    {
      id: 'science-1',
      title: 'Лов на екосистеми (Биологија)',
      subject: 'Природни науки',
      grade: '6 одд.',
      description: 'Теренска настава. Учениците истражуваат локални екосистеми, фотографираат растенија и мерат податоци на терен.',
      stages: 6,
      rating: 4.7
    },
    {
      id: 'history-1',
      title: 'Дигитален Времеплов',
      subject: 'Историја',
      grade: '9 одд.',
      description: 'Рута низ градот до споменици со аудио-информации. Учениците снимаат видео репортажи како новинари од минатото.',
      stages: 4,
      rating: 5.0
    },
    {
      id: 'lang-1',
      title: 'Интерактивна Лектира (Storytelling)',
      subject: 'Јазици',
      grade: '7-9 одд.',
      description: 'Секоја станица е поглавје. Учениците одговараат на прашања и самите одлучуваат како завршува приказната преку логички разгранувања.',
      stages: 10,
      rating: 4.6
    },
    {
      id: 'pe-1',
      title: 'Ориентационо трчање и здравје',
      subject: 'Физичко',
      grade: 'Сите',
      description: 'Комбинира физичка активност и знаење. Спринт помеѓу GPS точки и одговарање на брз квиз за анатомија.',
      stages: 7,
      rating: 4.5
    }
  ];

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = selectedCategory === 'Сите' || t.subject === selectedCategory || (selectedCategory === 'Омилени' && favorites.includes(t.id));
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: any) => {
    // Generate dummy stages for the template to pre-fill the BoundCreator
    const generatedStages = [];
    for (let i = 0; i < template.stages; i++) {
      let type = 'INFO';
      if (i === template.stages - 1) type = 'SURVEY';
      else if (i % 3 === 1) type = 'QUIZ';
      else if (i % 3 === 2) type = 'MISSION';
      
      generatedStages.push({
        id: `stage-${template.id}-${i}`,
        type,
        title: `${template.title} - Етапа ${i + 1}`,
        description: 'Прилагодете го описот според вашите потреби.',
        order: i,
        points: (i + 1) * 10
      });
    }

    onUseTemplate({
      title: `(Копија) ${template.title}`,
      description: template.description,
      stages: generatedStages
    });
  };

  return (
    <div className="space-y-6 mx-auto max-w-6xl w-full p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" /> Библиотека со Шаблони
          </h2>
          <p className="text-sm text-slate-400 mt-1">Откријте и копирајте готови авантури специјално дизајнирани за образовниот систем.</p>
        </div>
        
        <div className="relative w-full sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border-0 bg-slate-900 py-2.5 pl-9 pr-3 text-slate-200 ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6"
            placeholder="Пребарај шаблони..."
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
           <button
             key={cat}
             onClick={() => setSelectedCategory(cat)}
             className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
           >
             {cat}
           </button>
        ))}
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="group relative flex flex-col overflow-hidden rounded-xl bg-slate-800 shadow-sm border border-slate-700 transition-all hover:border-emerald-500 hover:shadow-lg">
            <div className="p-5 flex-1 flex flex-col cursor-pointer" onClick={() => setPreviewTemplate(template)}>
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                  {template.subject}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center text-xs font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                    {template.rating}
                  </span>
                  <button 
                    onClick={(e) => toggleFavorite(template.id, e)}
                    className={`transition-colors ${favorites.includes(template.id) ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(template.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-100 mb-2 leading-tight group-hover:text-emerald-400 transition-colors">{template.title}</h3>
              <p className="text-sm text-slate-400 mb-4 flex-1 line-clamp-3">{template.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-700 text-xs font-medium text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md">
                   <Users className="w-3.5 h-3.5 text-slate-500" />
                   {template.grade}
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md">
                   <FileText className="w-3.5 h-3.5 text-slate-500" />
                   {template.stages} етапи
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex gap-2">
              <button onClick={() => setPreviewTemplate(template)} className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors border border-slate-700">
                <Play className="w-4 h-4" />
              </button>
              <button onClick={() => handleUseTemplate(template)} className="flex-1 py-2.5 bg-slate-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors">
                Користи Шаблон
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-start">
              <div>
                <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/20 mb-3">
                  {previewTemplate.subject}
                </span>
                <h2 className="text-2xl font-bold text-slate-100 leading-tight">{previewTemplate.title}</h2>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-500 hover:text-slate-300 bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Опис</h3>
                <p className="text-slate-300 leading-relaxed">{previewTemplate.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Одделение</span>
                  </div>
                  <p className="font-bold text-slate-200">{previewTemplate.grade}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Етапи</span>
                  </div>
                  <p className="font-bold text-slate-200">{previewTemplate.stages} вкупно</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                Откажи
              </button>
              <button 
                onClick={() => handleUseTemplate(previewTemplate)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" /> Копирај и Започни
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
