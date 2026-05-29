import { useState, useEffect, useRef } from 'react';
import { Quest, Stage, Coordinates } from '../../types';
import { MapContainer, TileLayer, Marker, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Camera, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, X, Moon, Sun, Trophy, Medal, Cloud, CloudOff, Mic, Square, Navigation, Wifi, WifiOff } from 'lucide-react';
import { getQuestById } from '../../utils/storage';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

interface MobilePlayerProps {
  questId: string;
  questProp?: Quest;
  isPreview?: boolean;
}

// Helper to calculate distance in meters (Haversine formula)
function getDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // metres
  const phi1 = coord1.latitude * Math.PI/180;
  const phi2 = coord2.latitude * Math.PI/180;
  const diffPhi = (coord2.latitude - coord1.latitude) * Math.PI/180;
  const diffLambda = (coord2.longitude - coord1.longitude) * Math.PI/180;

  const a = Math.sin(diffPhi/2) * Math.sin(diffPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(diffLambda/2) * Math.sin(diffLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

export function MobilePlayer({ questId, questProp, isPreview }: MobilePlayerProps) {
  const [quest, setQuest] = useState<Quest | null>(questProp || null);
  const [hasStarted, setHasStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Specific stage states
  const [quizAnswer, setQuizAnswer] = useState<string>('');
  const [quizFeedback, setQuizFeedback] = useState<'success' | 'error' | null>(null);
  
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);

  // Sequence state
  const [completedStageIds, setCompletedStageIds] = useState<string[]>([]);
  const [isSelectingStage, setIsSelectingStage] = useState(false);

  // QR Scanner specific
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const [isNightMode, setIsNightMode] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [stageStartMark, setStageStartMark] = useState<number>(Date.now());
  const [stageDurations, setStageDurations] = useState<{stageId: string, durationSec: number}[]>([]);

  // Cached stages
  const [cachedStages, setCachedStages] = useState<Record<string, boolean>>({});

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedAudioURL, setRecordedAudioURL] = useState<string | null>(null);

  const [teamCode, setTeamCode] = useState('');
  const [toasts, setToasts] = useState<{id: string, text: string}[]>([]);
  const prevPointsRef = useRef(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (points > prevPointsRef.current) {
      const id = Math.random().toString();
      const gained = points - prevPointsRef.current;
      setToasts(prev => [...prev, {id, text: `Освоени +${gained} поени!` }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
      
      if (Math.random() > 0.8) {
         const id2 = Math.random().toString();
         setTimeout(() => {
           setToasts(prev => [...prev, {id: id2, text: "🏆 Отклучено достигнување!" }]);
           setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id2)), 3000);
         }, 800);
      }
    }
    prevPointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (quest && 'caches' in window) {
      caches.open(`actionbound-quest-${quest.id}`).then(async cache => {
        const keys = await cache.keys();
        const urls = keys.map(req => req.url);
        const cached: Record<string, boolean> = {};
        quest.stages.forEach(stage => {
            let isCached = true;
            const asAny = stage as any;
            if (asAny.mediaUrl && !urls.some(u => u.includes(asAny.mediaUrl) || asAny.mediaUrl.includes(u))) isCached = false;
            if (asAny.audioUrl && !urls.some(u => u.includes(asAny.audioUrl) || asAny.audioUrl.includes(u))) isCached = false;
            cached[stage.id] = isCached;
        });
        setCachedStages(cached);
      }).catch(err => console.log('Cache check err:', err));
    }
  }, [quest]);

  useEffect(() => {
    // Stage changed
    setStageStartMark(Date.now());
  }, [currentStageIndex]);

  useEffect(() => {
    if (isPreview && questProp) {
      setQuest(questProp);
      return;
    }
    async function load() {
      const loadedQuest = await getQuestById(questId);
      if (loadedQuest) {
        if (loadedQuest.sequence === 'random' && loadedQuest.stages.length > 0) {
          loadedQuest.stages = [...loadedQuest.stages].sort(() => Math.random() - 0.5);
        }
        if (loadedQuest.sequence === 'selectable' && loadedQuest.stages.length > 0) {
          setIsSelectingStage(true);
        }
        setQuest(loadedQuest);
      }
    }
    load();
  }, [questId]);

  const stages = quest?.stages || [];
  const stage = stages[currentStageIndex];
  
  // Handle Geolocation for FIND_SPOT
  // Timer specific
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (stage && (stage as any).timeLimitSeconds > 0) {
      setTimeLeft((stage as any).timeLimitSeconds);
    } else {
      setTimeLeft(null);
    }
    // Reset feedback on stage change
    setQuizFeedback(null);
  }, [stage]);

  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !quizFeedback && !timeExpired) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizFeedback && !timeExpired) {
      if (stage.type === 'QUIZ') {
         setQuizFeedback('error');
      } else {
         setTimeExpired(true);
      }
    }
  }, [timeLeft, quizFeedback, timeExpired, stage]);

  // YouTube Helper
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderMedia = () => {
    const mediaUrl = (stage as any).mediaUrl as string | undefined;
    if (!mediaUrl) return null;

    const audioUrl = (stage as any).audioUrl as string | undefined;
    const ytId = getYouTubeId(mediaUrl);

    const mediaContainer = (ytId || mediaUrl || audioUrl) ? (
      <div className="w-full mb-6 flex flex-col gap-4">
        {ytId ? (
          <div className="aspect-video rounded-xl overflow-hidden shadow-sm">
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        ) : mediaUrl ? (
          <img src={mediaUrl} alt="Мултимедија" className="w-full h-auto rounded-xl shadow-sm object-cover max-h-48" />
        ) : null}
        
        {audioUrl && (
          <audio controls className="w-full rounded-xl">
            <source src={audioUrl} type="audio/mpeg" />
            Вашиот прелистувач не поддржува аудио.
          </audio>
        )}
      </div>
    ) : null;
    
    return mediaContainer;
  };
  useEffect(() => {
    if (hasStarted && !isFinished) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCurrentLocation(newLoc);
          setPathHistory(prev => [...prev, [newLoc.latitude, newLoc.longitude]]);
          
          if (stage?.type === 'FIND_SPOT') {
            const dist = getDistance(newLoc, (stage as any).targetCoordinates);
            setDistanceToTarget(dist);
          }
        },
        (error) => console.error("Error getting location", error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [hasStarted, isFinished, stage]);

  // Handle QR code scanner initialization
  useEffect(() => {
    if (stage?.type === 'SCAN_CODE' && hasStarted && !isFinished) {
      // Need a bit of delay to ensure the DOM element is rendered
      const timer = setTimeout(() => {
        try {
          if (!scannerRef.current) {
             scannerRef.current = new Html5QrcodeScanner("reader", { 
               fps: 10, 
               qrbox: { width: 250, height: 250 },
               aspectRatio: 1.0, 
               showTorchButtonIfSupported: true 
             }, false);
             
             scannerRef.current.render((decodedText) => {
                 if (decodedText === (stage as any).targetQrPayload) {
                     scannerRef.current?.clear().catch(console.error);
                     setPoints(p => p + (stage.points || 0));
                     handleNextStage();
                 } else {
                     setScanError('Погрешен QR код. Обиди се повторно.');
                     setTimeout(() => setScanError(null), 3000);
                 }
             }, (error) => {
                // Ignore silent scanner errors
             });
          }
        } catch (e) {
          console.error("Scanner init error:", e);
        }
      }, 500);
      
      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      };
    }
  }, [stage, hasStarted, isFinished]);

  const handleNextStage = () => {
    const now = Date.now();
    const duration = Math.floor((now - stageStartMark) / 1000);
    setStageDurations(prev => [...prev, { stageId: stage.id, durationSec: duration }]);
    
    setQuizAnswer('');
    setQuizFeedback(null);
    setDistanceToTarget(null);
    setScanError(null);

    const newCompleted = [...completedStageIds, stage.id];
    setCompletedStageIds(newCompleted);

    if (quest?.sequence === 'selectable') {
      if (newCompleted.length >= stages.length) {
        setIsFinished(true);
        import('../../utils/storage').then(({ saveQuestResult }) => {
           saveQuestResult({ questId, playerName, points, completedAt: new Date().toISOString(), stageDurations: [...stageDurations, { stageId: stage.id, durationSec: duration }]});
        });
      } else {
        setIsSelectingStage(true);
      }
    } else {
      if (currentStageIndex < stages.length - 1) {
        setCurrentStageIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        import('../../utils/storage').then(({ saveQuestResult }) => {
           saveQuestResult({ questId, playerName, points, completedAt: new Date().toISOString(), stageDurations: [...stageDurations, { stageId: stage.id, durationSec: duration }]});
        });
      }
    }
  };

  const submitQuiz = () => {
    const isCorrect = quizAnswer === (stage as any).correctAnswer;
    if (isCorrect) {
      setPoints(prev => prev + (stage.points || 0));
      setQuizFeedback('success');
      setTimeout(() => handleNextStage(), 1500);
    } else {
      setQuizFeedback('error');
    }
  };

  const handleExit = () => {
     if (window.confirm('Сигурно сакате да ја напуштите авантурата? Вашиот напредок ќе биде изгубен.')) {
        window.location.href = '/';
     }
  };

  if (!quest) {
    return (
      <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} font-sans shadow-2xl relative transition-colors p-4`}>
        {/* Header Skeleton */}
        <div className="h-16 rounded-2xl w-full mb-8 animate-pulse bg-slate-200 dark:bg-slate-800"></div>
        {/* Title Skeleton */}
        <div className="h-10 rounded-xl w-3/4 mb-4 mx-auto animate-pulse bg-slate-300 dark:bg-slate-700"></div>
        <div className="h-4 rounded w-1/2 mx-auto mb-12 animate-pulse bg-slate-200 dark:bg-slate-800"></div>
        
        {/* Content Skeleton */}
        <div className="flex-1 space-y-4">
           <div className="h-40 rounded-3xl w-full animate-pulse bg-slate-200 dark:bg-slate-800"></div>
           <div className="h-20 rounded-2xl w-full animate-pulse bg-slate-200 dark:bg-slate-800"></div>
           <div className="h-20 rounded-2xl w-full animate-pulse bg-slate-200 dark:bg-slate-800"></div>
        </div>

        {/* Button Skeleton */}
        <div className="mt-8 h-14 rounded-xl w-full animate-pulse bg-indigo-500/30"></div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} font-sans shadow-2xl relative overflow-hidden transition-colors`}>
        <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
          <button onClick={() => setIsNightMode(!isNightMode)} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-500'} shadow-md transition-colors`}>
             {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => window.location.href = '/'} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} shadow-md transition-colors`}>
             <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-8 transform rotate-3">
            <MapPin className="w-12 h-12" />
          </div>
          <h1 className={`text-3xl font-bold tracking-tight ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{quest.title}</h1>
          <p className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-500'} mb-10`}>{quest.description}</p>
          
          <input 
            type="text" 
            placeholder="Внесете го вашето име..." 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className={`w-full text-center text-lg py-4 rounded-xl mb-6 font-bold outline-none border-2 transition-all ${
              isNightMode 
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-700' 
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/10'
            }`}
          />
          
          <button 
            onClick={() => setHasStarted(true)} 
            disabled={!playerName.trim()}
            className="w-full py-4 bg-slate-900 disabled:bg-slate-300 dark:disabled:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl font-bold uppercase tracking-wider shadow-2xl active:scale-95 transition-all outline-none"
          >
            Започни Авантура
          </button>
        </div>
      </div>
    );
  }

  if (isSelectingStage && !isFinished) {
    return (
      <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} font-sans shadow-2xl relative transition-colors`}>
        <div className={`px-6 py-4 flex items-center justify-between shadow-sm z-50 ${isNightMode ? 'bg-slate-800' : 'bg-white'}`}>
           <h2 className="font-bold text-lg">Избери следна етапа</h2>
           <button onClick={() => setIsNightMode(!isNightMode)} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-500'}`}>
             {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {stages.map((s, index) => {
            const isCompleted = completedStageIds.includes(s.id);
            return (
              <button
                key={s.id}
                disabled={isCompleted}
                onClick={() => {
                  setCurrentStageIndex(index);
                  setIsSelectingStage(false);
                  setStageStartMark(Date.now());
                }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                  isCompleted 
                    ? (isNightMode ? 'bg-slate-800/50 border-emerald-500/30 opacity-70' : 'bg-emerald-50 border-emerald-200 opacity-70')
                    : (isNightMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm')
                }`}
              >
                <div>
                  <h3 className={`font-bold ${isCompleted ? 'text-emerald-500' : (isNightMode ? 'text-slate-200' : 'text-slate-800')}`}>
                    {s.title || `Етапа ${index + 1}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{isCompleted ? 'Завршено' : 'Достапно за игра'}</p>
                </div>
                {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                {!isCompleted && <ChevronRight className="w-5 h-5 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }



  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    const { submitQuestFeedback } = await import('../../utils/storage');
    await submitQuestFeedback(questId, playerName, feedbackText, points);
    setFeedbackSubmitted(true);
  };

  if (isFinished) {
    return (
      <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'} font-sans shadow-2xl transition-colors overflow-y-auto`}>
        <div className="flex-1 flex flex-col justify-center p-6 text-center shrink-0">
          <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4 mx-auto" />
          <h2 className={`text-3xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>Честитки, {playerName}!</h2>
          <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-500'} mb-6`}>Успешно ја завршивте авантурата.</p>
          
          <div className={`${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-6 py-5 rounded-3xl shadow-sm border mb-6 transition-colors`}>
            <p className={`text-sm uppercase font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'} mb-1`}>Освоени поени</p>
            <p className="text-4xl font-black text-indigo-500">{points}</p>
          </div>

          {!feedbackSubmitted ? (
            <div className="mb-6 space-y-3 text-left">
              <label className={`block text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>Дискусија и коментари</label>
              <textarea 
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Споделете впечаток за авантурата..."
                className={`w-full p-3 rounded-xl border outline-none resize-none h-24 ${isNightMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'}`}
              />
              <button 
                onClick={handleFeedbackSubmit}
                disabled={!feedbackText.trim()}
                className="w-full py-3 bg-indigo-600 disabled:bg-slate-500 text-white rounded-xl font-bold transition-all text-sm"
              >
                Испрати коментар
              </button>
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
              Хвала за повратната информација!
            </div>
          )}

          <button onClick={() => window.location.href = '/'} className={`px-6 py-3 font-bold rounded-xl transition-colors ${isNightMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
            Врати се назад
          </button>
        </div>
      </div>
    );
  }

  const renderStageContent = () => {
    switch (stage.type) {
      case 'INFO':
        return (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-4`}>{stage.title}</h2>
            {renderMedia()}
            <div className={`${isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} p-6 rounded-2xl shadow-sm border leading-relaxed mb-6 transition-colors`}>
              {stage.description}
            </div>
            <div className="mt-auto">
              <button onClick={handleNextStage} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                Разбрав, понатаму
              </button>
            </div>
          </div>
        );
      
      case 'QUIZ':
        return (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
              <div className="bg-amber-100 text-amber-700 py-1.5 px-4 rounded-full font-bold text-xs uppercase shadow-sm">
                Коин: {stage.points} Поени
              </div>
            </div>
            <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-3`}>{stage.title}</h2>
            {renderMedia()}
            <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`}>{stage.description}</p>
            
            <div className="space-y-3 mb-6">
              {(stage as any).options?.map((opt: string) => (
                <button 
                  key={opt}
                  disabled={timeLeft === 0 || quizFeedback !== null}
                  onClick={() => setQuizAnswer(opt)}
                  className={`w-full p-4 rounded-xl text-left font-semibold transition-all border-2 ${
                    quizAnswer === opt 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-sm' 
                      : isNightMode 
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400' 
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {quizFeedback === 'error' && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">{timeLeft === 0 ? 'Времето истече!' : 'Погрешен одговор, обиди се повторно!'}</span>
              </div>
            )}
            
            {quizFeedback === 'success' && (
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 mb-4 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <span className="font-bold text-lg">Точно! +{stage.points}</span>
              </div>
            )}

            <div className="mt-auto">
              <button 
                onClick={submitQuiz}
                disabled={!quizAnswer || quizFeedback === 'success'}
                className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Потврди
              </button>
            </div>
          </div>
        );

      case 'FIND_SPOT':
        const target = (stage as any).targetCoordinates;
        const rad = (stage as any).radiusMeters || 20;
        const isCloseEnough = distanceToTarget !== null && distanceToTarget <= rad;

        // Find all other pending GPS target stages to help planning
        const otherPendingGPS = quest!.stages.filter(s => 
          s.type === 'FIND_SPOT' && 
          !completedStageIds.includes(s.id) && 
          s.id !== stage.id
        );

        const isStageCompleted = completedStageIds.includes(stage.id);

        return (
          <div className="flex-1 flex flex-col relative">
            <div className="absolute inset-0 z-0">
               <MapContainer center={[target.latitude, target.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <Circle center={[target.latitude, target.longitude]} radius={rad} pathOptions={{ color: 'emerald', fillColor: 'emerald', fillOpacity: 0.2 }} />
                 <Marker 
                   position={[target.latitude, target.longitude]} 
                   icon={(stage as any).mapIcon ? L.divIcon({ html: `<div style="font-size: 28px; line-height: 1; text-align: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${(stage as any).mapIcon === 'museum' ? '🏛️' : (stage as any).mapIcon === 'park' ? '🌳' : (stage as any).mapIcon === 'statue' ? '🗽' : (stage as any).mapIcon === 'school' ? '🏫' : '📍'}</div>`, className: '' }) : new L.Icon.Default()}
                 />
                 
                 {otherPendingGPS.map(s => {
                   const tCoord = (s as any).targetCoordinates;
                   return (
                     <Circle key={s.id} center={[tCoord.latitude, tCoord.longitude]} radius={(s as any).radiusMeters||20} pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.2, dashArray: '4' }} />
                   );
                 })}

                 <Polyline positions={pathHistory} pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.8 }} />
                 {currentLocation && (
                   <Marker position={[currentLocation.latitude, currentLocation.longitude]} />
                 )}
               </MapContainer>
            </div>
            <div className={`z-10 p-4 sticky top-0 ${isNightMode ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-transparent' : 'bg-gradient-to-b from-slate-50 via-slate-50/90 to-transparent'} pt-6`}>
              <div className={`${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} p-4 rounded-2xl shadow-lg border`}>
                <h2 className={`font-bold ${isNightMode ? 'text-white' : 'text-slate-800'} text-lg`}>{stage.title}</h2>
                <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'} mt-1 mb-3`}>{stage.description}</p>
                <div className={`flex items-center justify-between p-3 rounded-xl border ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-sm">Растојание:</span>
                  </div>
                  <span className={`font-bold text-lg ${isCloseEnough || isStageCompleted ? 'text-emerald-500' : (isNightMode ? 'text-slate-300' : 'text-slate-700')}`}>
                    {isStageCompleted ? 'Решено' : distanceToTarget !== null ? `${Math.round(distanceToTarget)} метри` : 'Се пресметува...'}
                  </span>
                </div>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${isNightMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  <Navigation className="w-4 h-4 mr-2"/> Отвори во Maps
                </a>
              </div>
            </div>

            <div className={`z-10 mt-auto p-6 pb-8 ${isNightMode ? 'bg-gradient-to-t from-slate-900 via-slate-900 to-transparent' : 'bg-gradient-to-t from-slate-50 via-slate-50 to-transparent'}`}>
              {isStageCompleted ? (
                <button onClick={() => handleNextStage()} className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-indigo-600 active:scale-95 transition-all">
                  Продолжи напред
                </button>
              ) : isCloseEnough ? (
                <button onClick={() => { setPoints(p => p + (stage.points || 0)); handleNextStage(); }} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-emerald-600 animate-pulse active:scale-95 transition-all">
                  Ја најдов! (+{stage.points})
                </button>
              ) : (
                <button 
                  /* ONLY FOR DEMO PURPOSES: Allow skipping */
                  onClick={() => { setPoints(p => p + (stage.points || 0)); handleNextStage(); }} 
                  className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-slate-900 active:scale-95 transition-all"
                >
                  Скип (За Демо)
                </button>
              )}
            </div>
          </div>
        );

      case 'SCAN_CODE':
        return (
          <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
            <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{stage.title}</h2>
            <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-4`}>{stage.description}</p>
            
            {scanError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold w-full mb-4 animate-pulse">
                 {scanError}
              </div>
            )}

            <div className="w-full max-w-[280px] bg-slate-900 rounded-3xl border-4 border-slate-200 flex flex-col items-center justify-center text-slate-500 mb-6 shadow-xl relative overflow-hidden">
               {/* Container for html5-qrcode */}
               <div id="reader" className="w-full bg-black min-h-[280px] rounded-2xl overflow-hidden [&_video]:object-cover" />
               <div className="absolute inset-0 border-[6px] border-emerald-500/0 pointer-events-none rounded-3xl z-10 transition-colors"></div>
            </div>
            
            <button 
              onClick={() => { setPoints(p => p + (stage.points || 0)); handleNextStage(); }} 
              className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold uppercase shadow-xl hover:bg-emerald-600 active:scale-95 transition-all mt-auto"
            >
              Скип Скен (За Демо) (+{stage.points})
            </button>
          </div>
        );

      case 'MISSION':
        const isAudio = (stage as any).submissionType === 'audio';
        
        return (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
            <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{stage.title}</h2>
            <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`}>{stage.description}</p>
            
            <div className={`w-full max-w-sm rounded-3xl border-2 border-dashed ${isNightMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'} flex flex-col items-center justify-center p-8 mb-6`}>
              {isAudio ? (
                 <>
                   <div className={`w-16 h-16 rounded-full ${isNightMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'} flex items-center justify-center mb-4`}>
                     <Mic className="w-8 h-8" />
                   </div>
                   <p className={`text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Снимете го вашиот одговор</p>
                   
                   {recordedAudioURL ? (
                     <div className="flex flex-col items-center w-full mt-4">
                       <audio src={recordedAudioURL} controls className="w-full h-10 outline-none mb-3" />
                       <button onClick={() => { setRecordedAudioURL(null); setQuizAnswer(''); }} className="text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors">Сними повторно</button>
                     </div>
                   ) : (
                     <button 
                       onClick={async () => {
                         if (!isRecording) {
                           try {
                             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                             mediaRecorderRef.current = new MediaRecorder(stream);
                             const chunks: Blob[] = [];
                             mediaRecorderRef.current.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                             mediaRecorderRef.current.onstop = () => {
                               const blob = new Blob(chunks, { type: 'audio/webm' });
                               setRecordedAudioURL(URL.createObjectURL(blob));
                               setQuizAnswer('recorded_audio');
                               stream.getTracks().forEach(t => t.stop());
                             };
                             mediaRecorderRef.current.start();
                             setIsRecording(true);
                           } catch (e) {
                             alert("Грешка при пристап до микрофонот.");
                           }
                         } else {
                           mediaRecorderRef.current?.stop();
                           setIsRecording(false);
                         }
                       }}
                       className={`mt-4 px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : (isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-300 shadow-sm')}`}
                     >
                       {isRecording ? <><Square className="w-4 h-4 fill-current"/> Стопирај Снимање</> : <><Mic className="w-4 h-4"/> Започни Снимање</>}
                     </button>
                   )}
                 </>
              ) : (
                 <>
                   <div className={`w-16 h-16 rounded-full ${isNightMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center mb-4`}>
                     <Camera className="w-8 h-8" />
                   </div>
                   <p className={`text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>Прикачете медија</p>
                   <p className={`text-xs ${isNightMode ? 'text-slate-500' : 'text-slate-500'}`}>Слика или Видео</p>
                   
                   <button 
                     onClick={() => setQuizAnswer('uploaded')}
                     className={`mt-4 px-6 py-2 rounded-xl text-sm font-bold transition-all ${quizAnswer ? 'bg-emerald-500 text-white' : (isNightMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200')}`}
                   >
                     {quizAnswer ? 'Прикачено!' : 'Избери датотека'}
                   </button>
                 </>
              )}
            </div>
            
            <button 
              onClick={() => { 
                setPoints(p => p + (stage.points || 0)); 
                handleNextStage(); 
                setRecordedAudioURL(null); 
              }} 
              disabled={!quizAnswer || isRecording}
              className="w-full py-4 bg-emerald-500 disabled:bg-slate-300 hover:bg-emerald-600 text-white rounded-xl font-bold uppercase shadow-xl active:scale-95 transition-all mt-auto"
            >
              Заврши ја мисијата (+{stage.points})
            </button>
          </div>
        );

      case 'SURVEY':
        return (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2 text-center`}>{stage.title}</h2>
            <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8 text-center`}>{stage.description}</p>
            
            <div className="mb-8">
              <label className={`block text-lg font-bold mb-4 text-center ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>Внесете го вашиот одговор:</label>
              <textarea 
                value={quizAnswer || ''}
                onChange={(e) => setQuizAnswer(e.target.value)}
                className={`w-full rounded-2xl p-4 min-h-[120px] resize-none outline-none border-2 transition-colors ${
                  isNightMode 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
                placeholder="Вашето мислење овде..."
              />
            </div>
            
            <button 
              onClick={() => { handleNextStage(); }} 
              disabled={!quizAnswer || quizAnswer.length < 3}
              className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-xl active:scale-95 transition-all mt-auto"
            >
              Поднеси анкета
            </button>
          </div>
        );

      default:
        return <div className="p-6">Непознат чекор.</div>;
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'} font-sans shadow-2xl border-x ${isNightMode ? 'border-slate-800' : 'border-slate-200'} transition-colors`}>
      {/* Top HUD */}
      <header className={`h-16 ${isNightMode ? 'bg-slate-950' : 'bg-indigo-950'} text-white px-6 flex items-center shrink-0 shadow-md relative z-20 transition-colors gap-4`}>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            {quest?.sequence === 'fixed' && completedStageIds.includes(stages[currentStageIndex - 1]?.id) && (
               <button 
                 onClick={() => setCurrentStageIndex(i => i - 1)}
                 className="text-[10px] font-bold text-indigo-300 hover:text-indigo-100 transition-colors uppercase tracking-wider"
               >
                 ← Назад
               </button>
            )}
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider line-clamp-1">{teamCode ? `${playerName} (${teamCode})` : playerName}</span>
          </div>
          <span className="text-sm font-bold">{points} ПОЕНИ</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Етапа</span>
          <span className="text-sm font-bold bg-indigo-900 px-2 py-0.5 rounded text-emerald-400 flex items-center gap-1">
             {completedStageIds.length + 1} / {stages.length}
             {stage && cachedStages[stage.id] && <Cloud className="w-3 h-3 text-emerald-300 ml-0.5" aria-label="Офлајн достапно" />}
          </span>
        </div>
        <div className="flex items-center gap-3 border-l border-indigo-800 pl-4 ml-2">
          {!isOnline && <WifiOff className="w-4 h-4 text-rose-500" aria-label="Офлајн" />}
          {isOnline && stages && Object.keys(cachedStages).length < stages.length && (
            <div className="relative group cursor-pointer" title="Некои ресурси не се кеширани">
              <CloudOff className="w-4 h-4 text-amber-400" />
            </div>
          )}
          <button type="button" aria-label="Мапа во живо" onClick={() => setShowLiveMap(true)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
            <MapPin className="w-5 h-5" />
          </button>
          <button type="button" aria-label="Турнир" onClick={() => setShowTournament(true)} className="text-amber-400 hover:text-amber-300 transition-colors">
            <Trophy className="w-5 h-5" />
          </button>
          <button type="button" aria-label="Смени тема" onClick={() => setIsNightMode(!isNightMode)} className="text-slate-300 hover:text-white transition-colors">
            {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button type="button" aria-label="Излез" onClick={handleExit} className="text-slate-300 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-950/50">
          <motion.div 
            className="h-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(completedStageIds.length + 1, stages.length) / stages.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </header>

      {/* Tournament Modal */}
      <AnimatePresence>
        {showTournament && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`absolute z-50 inset-x-0 bottom-0 top-16 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col`}
          >
            <div className={`p-4 border-b flex justify-between items-center ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-amber-500 w-6 h-6" /> Турнир во живо</h2>
              <button onClick={() => setShowTournament(false)} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800' : 'bg-slate-200'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {[
                 {name: playerName, pts: points, self: true},
                 {name: 'Алекс Т.', pts: Math.max(0, points - 15), self: false},
                 {name: 'Елена М.', pts: Math.max(0, points + 10), self: false},
                 {name: 'Марко И.', pts: Math.max(0, points - 50), self: false}
               ].sort((a,b) => b.pts - a.pts).map((t, idx) => (
                 <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${t.self ? (isNightMode ? 'bg-indigo-900/40 border-indigo-500' : 'bg-indigo-50 border-indigo-300') : (isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                   <div className="flex items-center gap-4">
                     <span className={`font-bold text-lg ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-500'}`}>#{idx+1}</span>
                     <span className={`font-bold ${t.self ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{t.name} {t.self && '(Ти)'}</span>
                   </div>
                   <span className="font-mono font-bold bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded text-sm">{t.pts}</span>
                 </div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showLiveMap && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`absolute z-[60] inset-x-0 bottom-0 top-16 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col`}
          >
            <div className={`p-4 border-b flex justify-between items-center ${isNightMode ? 'border-slate-800' : 'border-slate-200'} bg-slate-900 absolute top-0 inset-x-0 z-10 text-white shadow-xl bg-opacity-90 backdrop-blur-sm`}>
              <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-emerald-500 w-6 h-6" /> Мапа во живо</h2>
              <button onClick={() => setShowLiveMap(false)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 w-full h-full relative">
               <MapContainer 
                  center={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : [42.0, 21.4]} 
                  zoom={15} 
                  className="w-full h-full z-0"
               >
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 {currentLocation && (
                    <Marker position={[currentLocation.latitude, currentLocation.longitude]} />
                 )}
                 {pathHistory.length > 1 && (
                    <Polyline positions={pathHistory} color="#4F46E5" weight={4} dashArray="10, 10" />
                 )}
               </MapContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Timer HUD for all stages */}
      {timeLeft !== null && (
        <div className={`absolute top-20 right-4 font-mono font-bold text-xl ${isNightMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white/95 text-slate-700 border-slate-200'} px-4 py-1.5 rounded-xl border-2 shadow-lg z-50 transition-colors ${timeLeft <= 30 ? 'text-red-500 border-red-500 animate-pulse bg-red-50 dark:bg-red-900/20' : ''}`}>
          ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Main Content Area */}
      {stage.audioUrl && (
        <div className={`px-4 py-3 shrink-0 border-b ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <audio controls src={stage.audioUrl} className="w-full h-10 rounded outline-none" />
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStageIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col overflow-hidden relative"
        >
          {timeExpired && stage.type !== 'QUIZ' ? (
             <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
               <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
               <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>Времето истече!</h2>
               <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-8`}>Не успеавте да ја завршите етапата навреме.</p>
               <button onClick={() => { setTimeExpired(false); handleNextStage(); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-xl transition-all">
                 Продолжи понатаму
               </button>
             </div>
          ) : renderStageContent()}
        </motion.div>
      </AnimatePresence>

      {/* Toasts */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[60] pointer-events-none w-full px-4 items-center">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-xl text-center shadow-emerald-500/20 border-2 border-emerald-400 w-auto"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
