import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quest, Stage, Coordinates, QrTaskStage, SessionPlayer, StageSubmission, QuizAnswerRecord, questMaxScore } from 'shared';
import { MapContainer, TileLayer, Marker, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../utils/firebase';
import { MapPin, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, X, Moon, Sun, Trophy, Cloud, CloudOff, Navigation, WifiOff, Award, Lightbulb } from 'lucide-react';
import { getQuestById, saveQuestResult as saveQuestResultOnline } from '../../utils/storage';
import { DEMO_QUEST, DEMO_QUEST_ID } from '../../data/demoQuest';
import {
  cacheQuestLocally,
  getCachedQuest,
  isCachedLocally,
  saveOfflineResult,
  offlineQueueSize,
} from '../../utils/offlineQueue';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { MathRenderer } from '../editor/MathRenderer';
import { SEO, LearningResourceSchema } from '../SEO';
import { TournamentStagePlayer } from './stages/TournamentStagePlayer';
import { SurveyStagePlayer } from './stages/SurveyStagePlayer';
import { MissionStagePlayer } from './stages/MissionStagePlayer';
import { FindSpotStagePlayer } from './stages/FindSpotStagePlayer';
import { ScanCodeStagePlayer } from './stages/ScanCodeStagePlayer';
import { QrTaskStagePlayer } from './stages/QrTaskStagePlayer';
import { InfoStagePlayer } from './stages/InfoStagePlayer';
import { StageMedia } from './stages/StageMedia';
import { SwitchStagePlayer } from './stages/SwitchStagePlayer';
import { QuizStagePlayer } from './stages/QuizStagePlayer';
import { canAccessStage, collectGrantedItem, evaluateSwitchTarget, normalizeCollectedItemIds } from '../../lib/inventory';
import { trackEvent } from '../../utils/analytics';
import { clearCollectedItemIds, loadCollectedItemIds, saveCollectedItemIds } from '../../utils/playerInventoryState';
import { milestoneEncouragement, progressPercent } from '../../utils/encouragement';
import { shouldShowOnboarding, PLAYER_ONBOARDING_TIPS, ONBOARDING_STORAGE_KEY } from '../../utils/onboarding';
import { computeAchievements } from '../../utils/achievements';

interface MobilePlayerProps {
  questId: string;
  questProp?: Quest;
  isPreview?: boolean;
  // ─── Real-time session (Phase 5A) ───
  sessionCode?: string;       // when set, progress is reported to the live session
  sessionPlayerId?: string;   // anonymous player id within the session
  sessionPlayerName?: string; // pre-filled name (skips the name screen)
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

export function MobilePlayer({ questId, questProp, isPreview, sessionCode, sessionPlayerId, sessionPlayerName }: MobilePlayerProps) {
  const [quest, setQuest] = useState<Quest | null>(questProp || null);
  const [hasStarted, setHasStarted] = useState(!!sessionCode);
  const [showOnboarding, setShowOnboarding] = useState(() => !sessionCode && shouldShowOnboarding(typeof window !== 'undefined' ? window.localStorage : null));
  const [playerName, setPlayerName] = useState(sessionPlayerName ?? '');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [collectedItemIds, setCollectedItemIds] = useState<string[]>([]);
  
  // Specific stage states
  const [quizAnswer, setQuizAnswer] = useState<string>('');
  const [quizFeedback, setQuizFeedback] = useState<'success' | 'error' | null>(null);
  const [quizAttempts, setQuizAttempts] = useState(0);
  
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [pathHistory, setPathHistory] = useState<[number, number][]>([]);
  const [gpsError, setGpsError] = useState<'denied' | 'unavailable' | null>(null);
  const [gpsRetryToken, setGpsRetryToken] = useState(0);

  // Sequence state
  const [completedStageIds, setCompletedStageIds] = useState<string[]>([]);
  const [isSelectingStage, setIsSelectingStage] = useState(false);

  // QR Scanner specific
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [qrTaskScanned, setQrTaskScanned] = useState(false);
  
  // Seeded from the app's global theme (the same `.dark` class the handful of
  // `dark:` variants in this file already key off) so the player screen opens
  // in sync with whatever the user picked in Settings, instead of always
  // defaulting to light regardless of their saved preference.
  const [isNightMode, setIsNightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const [showTournament, setShowTournament] = useState(false);
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([]);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [stageStartMark, setStageStartMark] = useState<number>(Date.now());
  const [stageDurations, setStageDurations] = useState<{stageId: string, durationSec: number}[]>([]);

  // Cached stages
  const [cachedStages, setCachedStages] = useState<Record<string, boolean>>({});

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedAudioURL, setRecordedAudioURL] = useState<string | null>(null);

  // MISSION/SURVEY submissions (Phase 2 — rubric grading)
  const [stageSubmissions, setStageSubmissions] = useState<StageSubmission[]>([]);
  const [missionUploading, setMissionUploading] = useState(false);
  const [missionUploadedUrl, setMissionUploadedUrl] = useState<string | null>(null);
  const [missionUploadError, setMissionUploadError] = useState<string | null>(null);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  // First-attempt QUIZ answers, for per-question analytics (which distractors
  // students actually pick). A ref, not state — read once at submitResult
  // time, and doesn't need to trigger re-renders as it accumulates.
  const quizAnswerRecordsRef = useRef<QuizAnswerRecord[]>([]);

  const [teamCode, setTeamCode] = useState('');
  const [toasts, setToasts] = useState<{id: string, text: string}[]>([]);
  const prevPointsRef = useRef(0);
  const prevCompletedRef = useRef(0);
  const unlockedAchievementIdsRef = useRef<Set<string>>(new Set());
  const lastSessionLocationSentAtRef = useRef(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Feedback — must be at top, never after early returns
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Certificate generation
  const [generatingCert, setGeneratingCert] = useState(false);

  // Timer — must be at top, BEFORE any useEffect to keep hook order stable
  const [timeLeft, setTimeLeft]     = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);

  const navigate = useNavigate();
  
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

  // ─── Real-time session: report progress to the live leaderboard ──────────────
  useEffect(() => {
    if (!sessionCode || !sessionPlayerId) return;
    import('../../utils/sessionStorage')
      .then(({ updateProgress }) =>
        updateProgress(sessionCode, sessionPlayerId, {
          points,
          stageIndex: currentStageIndex,
          finished: isFinished,
        }),
      )
      .catch(() => {});
  }, [sessionCode, sessionPlayerId, points, currentStageIndex, isFinished]);

  // ─── Real-time session: follow host pace in broadcast mode ───────────────────
  useEffect(() => {
    if (!sessionCode) return;
    let unsub = () => {};
    import('../../utils/sessionStorage')
      .then(({ subscribeSession }) => {
        unsub = subscribeSession(sessionCode, sess => {
          setIsSessionActive(sess?.status === 'active');
          setSessionPlayers(sess?.players ?? []);
          if (sess && sess.mode === 'broadcast' && sess.status === 'active') {
            setCurrentStageIndex(prev =>
              prev === sess.currentStageIndex ? prev : sess.currentStageIndex,
            );
          }
        });
      })
      .catch(() => {});
    return () => unsub();
  }, [sessionCode]);

  // ─── Real-time session: send throttled GPS while the session is active ─────
  useEffect(() => {
    if (!sessionCode || !sessionPlayerId || !hasStarted || isFinished || !isSessionActive) return;
    if (!('geolocation' in navigator)) return;
    const activeStage = quest?.stages[currentStageIndex];

    let cancelled = false;
    let sendLocation: ((code: string, uid: string, location: { latitude: number; longitude: number }) => Promise<void>) | null = null;

    import('../../utils/sessionStorage')
      .then(mod => {
        if (!cancelled) sendLocation = mod.updatePlayerLocation;
      })
      .catch(() => {});

    const watchId = navigator.geolocation.watchPosition(
      position => {
        const now = Date.now();
        if (now - lastSessionLocationSentAtRef.current < 10_000) return;
        lastSessionLocationSentAtRef.current = now;

        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (activeStage?.type === 'FIND_SPOT') {
          setCurrentLocation(location);
        }

        sendLocation?.(sessionCode, sessionPlayerId, location).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [sessionCode, sessionPlayerId, hasStarted, isFinished, isSessionActive, quest, currentStageIndex]);

  useEffect(() => {
    if (points > prevPointsRef.current) {
      const id = Math.random().toString();
      const gained = points - prevPointsRef.current;
      setToasts(prev => [...prev, {id, text: `Освоени +${gained} поени!` }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);

      // Real achievement check (same computeAchievements used on the finish
      // screen) instead of a decorative random toast — only fires once per
      // badge, the first time it's actually earned.
      const earned = computeAchievements({
        points,
        maxPoints: questMaxScore(quest),
        completedStages: completedStageIds.length,
        totalStages: stages.length,
        collectedItems: collectedItemIds.length,
        totalItems: inventoryItems.length,
      });
      const newlyUnlocked = earned.filter(a => !unlockedAchievementIdsRef.current.has(a.id));
      newlyUnlocked.forEach(a => unlockedAchievementIdsRef.current.add(a.id));
      if (newlyUnlocked.length > 0) {
        const id2 = Math.random().toString();
        setTimeout(() => {
          setToasts(prev => [...prev, { id: id2, text: `🏆 ${newlyUnlocked[0].title}` }]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id2)), 3000);
        }, 800);
      }
    }
    prevPointsRef.current = points;
  }, [points]);

  // Encouraging milestone microcopy as the player crosses 25 / 50 / 75 / 100%
  const totalStageCount = quest?.stages?.length ?? 0;
  useEffect(() => {
    const completed = completedStageIds.length;
    if (completed > prevCompletedRef.current && totalStageCount > 0) {
      const msg = milestoneEncouragement(completed, totalStageCount);
      if (msg) {
        const id = Math.random().toString();
        setToasts(prev => [...prev, { id, text: msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
      }
    }
    prevCompletedRef.current = completed;
  }, [completedStageIds.length, totalStageCount]);

  useEffect(() => {
    if (quest && 'caches' in window) {
      // Read from the Service Worker media cache (same name the SW serves from).
      caches.open('av-media-v2').then(async cache => {
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
      }).catch(err => console.warn('Cache check err:', err));
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
    if (questId === DEMO_QUEST_ID) {
      setQuest(DEMO_QUEST);
      return;
    }
    async function load() {
      let loadedQuest = null;

      if (navigator.onLine) {
        try {
          loadedQuest = await getQuestById(questId);
          // Cache locally for future offline use
          if (loadedQuest) cacheQuestLocally(loadedQuest);
        } catch {
          // Network error — fall through to local cache
          loadedQuest = getCachedQuest(questId);
        }
      } else {
        loadedQuest = getCachedQuest(questId);
        if (loadedQuest) {
          const id = Math.random().toString();
          setToasts(prev => [...prev, { id, text: '📵 Офлајн режим — квестот е зачуван локално' }]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
        }
      }

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
  const inventoryItems = quest?.inventoryItems ?? [];
  const stageLocked = stage ? !canAccessStage(stage, collectedItemIds) : false;
  const missingRequiredItem = inventoryItems.find(item => item.id === stage?.requiresItemId);

  // Auto-route SWITCH stages (when showPathsToPlayer is false)
  useEffect(() => {
    if (!stage || stage.type !== 'SWITCH') return;
    const sw = stage as import('shared').SwitchStage;
    if (sw.showPathsToPlayer) return;
    const targetId = evaluateSwitchTarget(sw, points, completedStageIds, collectedItemIds);
    if (targetId) {
      jumpToStageById(targetId);
    } else {
      // No target — skip to next stage
      const nextIdx = currentStageIndex + 1;
      if (nextIdx < stages.length) setCurrentStageIndex(nextIdx);
    }
  }, [stage?.id, points, completedStageIds, collectedItemIds, currentStageIndex, stages.length]);

  // Timer effect — syncs timeLeft when stage changes (state declared at top)
  useEffect(() => {
    if (stage && (stage as any).timeLimitSeconds > 0) {
      const multiplier = sessionPlayers.find(p => p.uid === sessionPlayerId)?.timeMultiplier || 1;
      setTimeLeft(Math.round((stage as any).timeLimitSeconds * multiplier));
    } else {
      setTimeLeft(null);
    }
    // Reset feedback on stage change
    setQuizFeedback(null);
    setQuizAttempts(0);
  }, [stage]);

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

  useEffect(() => {
    const actorId = (sessionPlayerId ?? playerName.trim().toLowerCase()).trim();
    if (!questId || !hasStarted || !actorId) return;
    const saved = loadCollectedItemIds(questId, actorId);
    setCollectedItemIds(normalizeCollectedItemIds(saved, inventoryItems));
  }, [questId, sessionPlayerId, playerName, hasStarted, inventoryItems]);

  useEffect(() => {
    if (!hasStarted || !quest) return;
    trackEvent('quest_start', {
      quest_id: quest.id,
      stage_count: quest.stages.length,
      sequence: quest.sequence,
      session_mode: Boolean(sessionCode),
      preview: Boolean(isPreview),
    });
  }, [hasStarted, quest, sessionCode, isPreview]);

  useEffect(() => {
    const actorId = (sessionPlayerId ?? playerName.trim().toLowerCase()).trim();
    if (!questId || !hasStarted || !actorId) return;
    saveCollectedItemIds(questId, actorId, collectedItemIds);
  }, [questId, sessionPlayerId, playerName, hasStarted, collectedItemIds]);

  useEffect(() => {
    const actorId = (sessionPlayerId ?? playerName.trim().toLowerCase()).trim();
    if (!questId || !actorId || !isFinished) return;
    clearCollectedItemIds(questId, actorId);
  }, [questId, sessionPlayerId, playerName, isFinished]);

  // Only watch GPS position on FIND_SPOT stages to save battery
  useEffect(() => {
    if (!hasStarted || isFinished || stage?.type !== 'FIND_SPOT') return;
    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsError(null);
        const newLoc = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrentLocation(newLoc);
        setPathHistory(prev => [...prev, [newLoc.latitude, newLoc.longitude]]);
        const dist = getDistance(newLoc, (stage as any).targetCoordinates);
        setDistanceToTarget(dist);
      },
      (error) => {
        console.warn('[GPS]', error.message);
        setGpsError(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasStarted, isFinished, stage?.id, gpsRetryToken]);

  // Handle QR code scanner initialization
  useEffect(() => {
    const isScanStage = stage?.type === 'SCAN_CODE' || stage?.type === 'QR_TASK';
    // For QR_TASK the scanner is only active until the code is matched
    const scannerActive = isScanStage && hasStarted && !isFinished &&
      !(stage?.type === 'QR_TASK' && qrTaskScanned);

    if (scannerActive) {
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
                     scannerRef.current = null;
                     setScanError(null);
                     if (stage.type === 'QR_TASK') {
                         // Reveal the task; points awarded after the answer
                         setQrTaskScanned(true);
                     } else {
                         setPoints(p => p + (stage.points || 0));
                         handleNextStage();
                     }
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
  }, [stage, hasStarted, isFinished, qrTaskScanned]);

  const [isQuestCached, setIsQuestCached] = useState(false);
  const [caching, setCaching] = useState(false);

  useEffect(() => {
    if (quest) setIsQuestCached(isCachedLocally(quest.id));
  }, [quest]);

  const downloadForOffline = async () => {
    if (!quest || caching) return;
    setCaching(true);
    try {
      // 1. Save quest JSON to localStorage
      cacheQuestLocally(quest);
      setIsQuestCached(true);
      // 2. Ask SW to cache all media files
      const mediaUrls = quest.stages.flatMap(s => {
        const u: string[] = [];
        if ('mediaUrl' in s && (s as { mediaUrl?: string }).mediaUrl) {
          u.push((s as { mediaUrl: string }).mediaUrl);
        }
        if (s.audioUrl) u.push(s.audioUrl);
        return u;
      }).filter(u => u.startsWith('http') && !u.includes('youtube.com'));

      if (navigator.serviceWorker?.controller && mediaUrls.length) {
        navigator.serviceWorker.controller.postMessage({ type: 'CACHE_MEDIA', urls: mediaUrls });
      }
      const id = Math.random().toString();
      setToasts(prev => [...prev, { id, text: '☁ Квестот е зачуван за офлајн играње!' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    } finally {
      setCaching(false);
    }
  };

  const handleSos = () => {
    if (!sessionCode || !sessionPlayerId || sendingSos || !isSessionActive) return;
    if (!('geolocation' in navigator)) {
      const id = Math.random().toString();
      setToasts(prev => [...prev, { id, text: '🆘 GPS не е достапен на овој уред.' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
      return;
    }

    setSendingSos(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCurrentLocation(location);
        import('../../utils/sessionStorage')
          .then(({ raiseSosAlert }) => raiseSosAlert(sessionCode, sessionPlayerId, location))
          .then(() => {
            const id = Math.random().toString();
            setToasts(prev => [...prev, { id, text: '🆘 SOS е испратен до наставникот.' }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
          })
          .catch(() => {
            const id = Math.random().toString();
            setToasts(prev => [...prev, { id, text: 'Не успеа испраќањето на SOS. Обиди се повторно.' }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
          })
          .finally(() => setSendingSos(false));
      },
      () => {
        const id = Math.random().toString();
        setToasts(prev => [...prev, { id, text: 'Не може да се земе моменталната GPS локација.' }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
        setSendingSos(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const submitResult = (
    finalPoints: number,
    finalDurations: typeof stageDurations,
    finalSubmissions: StageSubmission[] = stageSubmissions,
  ) => {
    trackEvent('quest_finish', {
      quest_id: questId,
      points: finalPoints,
      total_stages: stages.length,
      completed_stages: completedStageIds.length + 1,
      duration_sec: finalDurations.reduce((sum, item) => sum + item.durationSec, 0),
      session_mode: Boolean(sessionCode),
    });

    if (isPreview || questId === DEMO_QUEST_ID) return;

    const result = {
      questId,
      playerName,
      points: finalPoints,
      completedAt: new Date().toISOString(),
      stageDurations: finalDurations,
      ...(finalSubmissions.length > 0 ? { submissions: finalSubmissions } : {}),
      ...(quizAnswerRecordsRef.current.length > 0 ? { quizAnswers: quizAnswerRecordsRef.current } : {}),
    };
    if (navigator.onLine) {
      saveQuestResultOnline(result).catch(() => {
        saveOfflineResult(result);
      });
    } else {
      saveOfflineResult(result);
      const pending = offlineQueueSize();
      const id = Math.random().toString();
      setToasts(prev => [...prev, { id, text: `📵 Резултатот ќе се синхронизира (${pending} на чекање)` }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    }
  };

  const jumpToStageById = (targetId: string) => {
    const idx = stages.findIndex(s => s.id === targetId);
    if (idx !== -1) setCurrentStageIndex(idx);
  };

  /** Uploads a MISSION photo/video/audio submission to Storage and returns its download URL. */
  const uploadSubmissionBlob = (blob: Blob, stageId: string, ext: string): Promise<string> => {
    setMissionUploading(true);
    setMissionUploadError(null);
    const storageRef = ref(storage, `submissions/${questId}/${stageId}-${Date.now()}.${ext}`);
    const task = uploadBytesResumable(storageRef, blob, { contentType: blob.type });
    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        undefined,
        err => { setMissionUploading(false); setMissionUploadError('Прикачувањето не успеа. Обиди се повторно.'); reject(err); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setMissionUploading(false);
          setMissionUploadedUrl(url);
          resolve(url);
        },
      );
    });
  };

  const handleNextStage = (overrideNextId?: string, submission?: StageSubmission) => {
    const now = Date.now();
    const duration = Math.floor((now - stageStartMark) / 1000);
    setStageDurations(prev => [...prev, { stageId: stage.id, durationSec: duration }]);
    trackEvent('stage_complete', {
      quest_id: questId,
      stage_id: stage.id,
      stage_type: stage.type,
      stage_order: currentStageIndex,
      points_awarded: stage.points || 0,
      duration_sec: duration,
      session_mode: Boolean(sessionCode),
    });

    setQuizAnswer('');
    setQuizFeedback(null);
    setQuizAttempts(0);
    setDistanceToTarget(null);
    setScanError(null);
    setQrTaskScanned(false);
    setMissionUploadedUrl(null);
    setMissionUploadError(null);
    setSurveyAnswers({});

    const newCompleted = [...completedStageIds, stage.id];
    const nextCollectedItemIds = collectGrantedItem(collectedItemIds, stage);
    const newSubmissions = submission ? [...stageSubmissions, submission] : stageSubmissions;
    setCompletedStageIds(newCompleted);
    setCollectedItemIds(nextCollectedItemIds);
    if (submission) setStageSubmissions(newSubmissions);

    // SWITCH stage: jump to evaluated target directly
    if (overrideNextId) {
      jumpToStageById(overrideNextId);
      setStageStartMark(Date.now());
      return;
    }

    const finalDurations = [...stageDurations, { stageId: stage.id, durationSec: duration }];

    if (quest?.sequence === 'selectable') {
      const nonSwitchStages = stages.filter(s => s.type !== 'SWITCH');
      const completedNonSwitch = newCompleted.filter(id => stages.find(s => s.id === id && s.type !== 'SWITCH'));
      if (completedNonSwitch.length >= nonSwitchStages.length) {
        setIsFinished(true);
        submitResult(points, finalDurations, newSubmissions);
      } else {
        setIsSelectingStage(true);
      }
    } else {
      let nextIdx = currentStageIndex + 1;
      if (nextIdx < stages.length) {
        setCurrentStageIndex(nextIdx);
      } else {
        setIsFinished(true);
        submitResult(points, finalDurations, newSubmissions);
      }
    }
    setStageStartMark(Date.now());
  };

  const submitQuiz = () => {
    const correct = (stage as any).correctAnswer;
    // Normalize both to trimmed strings for comparison (handles string + number types)
    const isCorrect = String(quizAnswer).trim().toLowerCase() === String(correct).trim().toLowerCase();
    // Only the first attempt is recorded — it's the one that reveals a real
    // misconception; retries after that are just "trying again".
    if (quizAttempts === 0) {
      quizAnswerRecordsRef.current = [
        ...quizAnswerRecordsRef.current,
        { stageId: stage.id, selectedAnswer: String(quizAnswer), correct: isCorrect },
      ];
    }
    if (isCorrect) {
      setPoints(prev => prev + (stage.points || 0));
      setQuizFeedback('success');
      setTimeout(() => handleNextStage(), 1500);
    } else {
      setQuizFeedback('error');
      setQuizAttempts(prev => prev + 1);
    }
  };

  const submitQrTask = () => {
    const qr = stage as QrTaskStage;
    const correct = qr.correctAnswer?.trim();
    // Manual grading (photo or no correct answer set) — always accept
    const autoGrade = qr.answerType !== 'photo' && !!correct;

    if (!autoGrade) {
      setPoints(prev => prev + (stage.points || 0));
      setQuizFeedback('success');
      setTimeout(() => handleNextStage(), 1200);
      return;
    }

    const isCorrect = String(quizAnswer).trim().toLowerCase() === String(correct).toLowerCase();
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
        navigate('/');
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
        <SEO title={quest.title} description={quest.description} noIndex />
        {quest.visibility === 'public' && (
          <LearningResourceSchema
            title={quest.title}
            description={quest.description}
            url={`/play/${questId}`}
            subject={quest.pedagogy?.subject}
            grade={quest.pedagogy?.grade}
          />
        )}
        <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
          <button onClick={() => setIsNightMode(!isNightMode)} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-500'} shadow-md transition-colors`}>
             {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button type="button" aria-label="Напушти авантура" onClick={() => navigate('/')} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} shadow-md transition-colors`}>
             <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-8 transform rotate-3">
            <MapPin className="w-12 h-12" />
          </div>
          <h1 className={`text-3xl font-bold tracking-tight ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>{quest.title}</h1>
          <p className={`text-sm ${isNightMode ? 'text-slate-400' : 'text-slate-500'} ${showOnboarding ? 'mb-6' : 'mb-10'}`}>{quest.description}</p>

          {showOnboarding && (
            <div
              role="region"
              aria-label="Совети за играње"
              className={`w-full text-left rounded-2xl border mb-6 p-4 ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`flex items-center gap-2 text-sm font-bold ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Lightbulb className="w-4 h-4" /> Како се игра
                </span>
                <button
                  type="button"
                  onClick={() => {
                    try { window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1'); } catch { /* ignore */ }
                    setShowOnboarding(false);
                  }}
                  className={`text-xs font-semibold ${isNightMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'} transition-colors`}
                >
                  Сфатив
                </button>
              </div>
              <ul className="space-y-2.5">
                {PLAYER_ONBOARDING_TIPS.map((tip) => (
                  <li key={tip.title} className="flex gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <p className={`text-sm font-semibold ${isNightMode ? 'text-slate-200' : 'text-slate-800'}`}>{tip.title}</p>
                      <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{tip.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            const isAccessible = canAccessStage(s, collectedItemIds);
            const requiredItem = inventoryItems.find(item => item.id === s.requiresItemId);
            return (
              <button
                key={s.id}
                disabled={isCompleted || !isAccessible}
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
                  <p className="text-xs text-slate-500 mt-1">
                    {isCompleted ? 'Завршено' : isAccessible ? 'Достапно за игра' : `Заклучено${requiredItem ? ` • треба ${requiredItem.icon ? `${requiredItem.icon} ` : ''}${requiredItem.name}` : ''}`}
                  </p>
                </div>
                {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                {!isCompleted && isAccessible && <ChevronRight className="w-5 h-5 text-slate-400" />}
                {!isCompleted && !isAccessible && <span className="text-xs font-bold text-amber-500">Заклучено</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }



  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    const { submitQuestFeedback } = await import('../../utils/storage');
    await submitQuestFeedback(questId, playerName, feedbackText, points);
    setFeedbackSubmitted(true);
  };

  const handleDownloadCertificate = async () => {
    if (generatingCert) return;
    setGeneratingCert(true);
    try {
      const maxScore = stages.reduce((sum, s) => sum + (s.points || 0), 0);
      const { downloadCertificate } = await import('../../utils/certificate');
      await downloadCertificate({
        playerName: playerName || 'Играч',
        questTitle: quest?.title || 'Авантура',
        score: points,
        maxScore,
        date: new Date(),
        watermark: quest?.certificateWatermark ?? false,
      });
    } catch (e) {
      console.error('Certificate generation failed', e);
    } finally {
      setGeneratingCert(false);
    }
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

          {(() => {
            const achievements = computeAchievements({
              points,
              maxPoints: questMaxScore(quest),
              completedStages: completedStageIds.length,
              totalStages: stages.length,
              collectedItems: collectedItemIds.length,
              totalItems: inventoryItems.length,
            });
            if (achievements.length === 0) return null;
            return (
              <div className={`${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-5 py-4 rounded-2xl shadow-sm border mb-6 text-left`}>
                <p className={`text-xs uppercase font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'} mb-3`}>Постигнувања</p>
                <div className="space-y-2.5">
                  {achievements.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-2xl shrink-0" aria-hidden="true">{a.icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${isNightMode ? 'text-slate-100' : 'text-slate-800'}`}>{a.title}</p>
                        <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {inventoryItems.length > 0 && collectedItemIds.length > 0 && (
            <div className={`${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} px-5 py-4 rounded-2xl shadow-sm border mb-6 text-left`}>
              <p className={`text-xs uppercase font-bold ${isNightMode ? 'text-slate-500' : 'text-slate-400'} mb-2`}>Собрани предмети</p>
              <div className="flex flex-wrap gap-2">
                {inventoryItems.filter(item => collectedItemIds.includes(item.id)).map(item => (
                  <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 text-sm font-semibold">
                    {item.icon ? `${item.icon} ` : ''}{item.name}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {(quest?.certificateEnabled ?? true) && (
            <button
              onClick={handleDownloadCertificate}
              disabled={generatingCert}
              className="w-full mb-3 px-6 py-3.5 font-bold rounded-xl transition-all bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white flex items-center justify-center gap-2 shadow-lg"
            >
              <Award className="w-5 h-5" />
              {generatingCert ? 'Се генерира…' : 'Преземи сертификат'}
            </button>
          )}

          <button onClick={() => navigate('/')} className={`px-6 py-3 font-bold rounded-xl transition-colors ${isNightMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
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
          <InfoStagePlayer stage={stage as import('shared').InfoStage} isNightMode={isNightMode} onContinue={() => handleNextStage()} />
        );
      
      case 'QUIZ':
        return (
          <QuizStagePlayer
            stage={stage as import('shared').QuizStage}
            isNightMode={isNightMode}
            timeLeft={timeLeft}
            quizAnswer={quizAnswer}
            quizFeedback={quizFeedback}
            quizAttempts={quizAttempts}
            onAnswerChange={setQuizAnswer}
            onSubmit={submitQuiz}
            onSkip={() => handleNextStage()}
          />
        );

      case 'FIND_SPOT': {
        const findSpotStage = stage as import('shared').FindSpotStage;
        const otherPendingGPS = (quest!.stages as import('shared').Stage[]).filter(
          (s): s is import('shared').FindSpotStage =>
            s.type === 'FIND_SPOT' && !completedStageIds.includes(s.id) && s.id !== stage.id,
        );
        return (
          <FindSpotStagePlayer
            stage={findSpotStage}
            isNightMode={isNightMode}
            otherPendingTargets={otherPendingGPS}
            currentLocation={currentLocation}
            pathHistory={pathHistory}
            distanceToTarget={distanceToTarget}
            gpsError={gpsError}
            isStageCompleted={completedStageIds.includes(stage.id)}
            onRetryGps={() => { setGpsError(null); setGpsRetryToken(t => t + 1); }}
            onSkip={() => handleNextStage()}
            onArrived={() => { setPoints(p => p + (stage.points || 0)); handleNextStage(); }}
            onContinue={() => handleNextStage()}
          />
        );
      }

      case 'SCAN_CODE':
        return (
          <ScanCodeStagePlayer stage={stage as import('shared').ScanCodeStage} isNightMode={isNightMode} scanError={scanError} />
        );

      case 'QR_TASK':
        return (
          <QrTaskStagePlayer
            stage={stage as QrTaskStage}
            isNightMode={isNightMode}
            scanError={scanError}
            qrTaskScanned={qrTaskScanned}
            quizAnswer={quizAnswer}
            quizFeedback={quizFeedback}
            onAnswerChange={setQuizAnswer}
            onPhotoSelected={() => setQuizAnswer('uploaded')}
            onSubmit={submitQrTask}
            onSkip={() => handleNextStage()}
          />
        );

      case 'MISSION': {
        const missionStage = stage as import('shared').MissionStage;

        const handleToggleRecording = async () => {
          if (!isRecording) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaRecorderRef.current = new MediaRecorder(stream);
              const chunks: Blob[] = [];
              mediaRecorderRef.current.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
              mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setRecordedAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
                uploadSubmissionBlob(blob, stage.id, 'webm').catch(() => {});
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
        };

        const handleFileSelected = (file: File) => {
          if (file.size > 20 * 1024 * 1024) { setMissionUploadError('Датотеката е преголема (max 20MB).'); return; }
          const ext = file.name.split('.').pop() || (file.type.includes('video') ? 'mp4' : 'jpg');
          uploadSubmissionBlob(file, stage.id, ext).catch(() => {});
        };

        const finishMission = () => {
          if (!missionUploadedUrl) return;
          const submission: StageSubmission = {
            stageId: stage.id,
            type: missionStage.submissionType,
            mediaUrl: missionUploadedUrl,
          };
          if (!missionStage.rubric?.criteria?.length) setPoints(p => p + (stage.points || 0));
          handleNextStage(undefined, submission);
          setRecordedAudioURL(null);
        };

        return (
          <MissionStagePlayer
            stage={missionStage}
            isNightMode={isNightMode}
            isRecording={isRecording}
            recordedAudioURL={recordedAudioURL}
            missionUploading={missionUploading}
            missionUploadedUrl={missionUploadedUrl}
            missionUploadError={missionUploadError}
            onToggleRecording={handleToggleRecording}
            onRetakeAudio={() => { setRecordedAudioURL(null); setMissionUploadedUrl(null); }}
            onFileSelected={handleFileSelected}
            onFinish={finishMission}
          />
        );
      }

      case 'SURVEY': {
        const surveyStage = stage as import('shared').SurveyStage;
        return (
          <SurveyStagePlayer
            stage={surveyStage}
            isNightMode={isNightMode}
            answers={surveyAnswers}
            onAnswerChange={(i, v) => setSurveyAnswers(prev => ({ ...prev, [i]: v }))}
            onSubmit={submission => {
              if (!surveyStage.rubric?.criteria?.length) setPoints(p => p + (stage.points || 0));
              handleNextStage(undefined, submission);
            }}
          />
        );
      }

      case 'TOURNAMENT':
        return (
          <TournamentStagePlayer
            stage={stage as import('shared').TournamentStage}
            isNightMode={isNightMode}
            onFinish={() => { setPoints(p => p + (stage.points || 0)); handleNextStage(); }}
          />
        );

      case 'SWITCH':
        return (
          <SwitchStagePlayer
            stage={stage as import('shared').SwitchStage}
            isNightMode={isNightMode}
            allStages={stages}
            points={points}
            completedStageIds={completedStageIds}
            collectedItemIds={collectedItemIds}
            inventoryItems={inventoryItems}
            onChoosePath={targetStageId => handleNextStage(targetStageId)}
          />
        );

      default:
        return <div className="p-6 text-slate-500">Непознат тип на етапа.</div>;
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto ${isNightMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'} font-sans shadow-2xl border-x ${isNightMode ? 'border-slate-800' : 'border-slate-200'} transition-colors`}>
      <SEO title={quest.title} description={quest.description} noIndex />
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
          {sessionCode && isSessionActive && !isFinished && (
            <button
              type="button"
              aria-label="Испрати SOS"
              onClick={handleSos}
              disabled={sendingSos}
              className="text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors"
              title="Испрати SOS"
            >
              <AlertCircle className={`w-5 h-5 ${sendingSos ? 'animate-pulse' : ''}`} />
            </button>
          )}
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
          <button
            type="button"
            aria-label={isQuestCached ? 'Квестот е зачуван офлајн' : 'Преземи за офлајн'}
            onClick={downloadForOffline}
            disabled={caching || isQuestCached}
            title={isQuestCached ? 'Квестот е достапен офлајн' : 'Зачувај за офлајн'}
            className="text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            {isQuestCached
              ? <Cloud className="w-5 h-5 text-emerald-400" />
              : caching
                ? <RefreshCw className="w-5 h-5 animate-spin" />
                : <CloudOff className="w-5 h-5" />}
          </button>
          <button type="button" aria-label="Смени тема" onClick={() => setIsNightMode(!isNightMode)} className="text-slate-300 hover:text-white transition-colors">
            {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button type="button" aria-label="Излез" onClick={handleExit} className="text-slate-300 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        {/* Progress Bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-950/50"
          role="progressbar"
          aria-label="Напредок низ авантурата"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent(completedStageIds.length, stages.length)}
        >
          <motion.div 
            className="h-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(completedStageIds.length + 1, stages.length) / stages.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </header>

      {inventoryItems.length > 0 && (
        <div className={`px-4 py-2 border-b shrink-0 ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>Инвентар</span>
            {inventoryItems.map(item => {
              const active = collectedItemIds.includes(item.id);
              return (
                <span key={item.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : (isNightMode ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200')}`}>
                  {item.icon ? `${item.icon} ` : ''}{item.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tournament Modal */}
      <AnimatePresence>
        {showTournament && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`absolute z-50 inset-x-0 bottom-0 top-16 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} border-t shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col`}
          >
            <div className={`p-4 border-b flex justify-between items-center ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-amber-500 w-6 h-6" /> Турнир во живо</h2>
              <button type="button" aria-label="Затвори турнир" onClick={() => setShowTournament(false)} className={`p-2 rounded-full ${isNightMode ? 'bg-slate-800' : 'bg-slate-200'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {sessionCode && sessionPlayers.length > 0 ? (
                 sessionPlayers
                   .map(p => ({ name: p.name, pts: p.points, self: p.uid === sessionPlayerId }))
                   .sort((a, b) => b.pts - a.pts)
                   .map((t, idx) => (
                     <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${t.self ? (isNightMode ? 'bg-indigo-900/40 border-indigo-500' : 'bg-indigo-50 border-indigo-300') : (isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                       <div className="flex items-center gap-4">
                         <span className={`font-bold text-lg ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-500'}`}>#{idx+1}</span>
                         <span className={`font-bold ${t.self ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>{t.name} {t.self && '(Ти)'}</span>
                       </div>
                       <span className="font-mono font-bold bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded text-sm">{t.pts}</span>
                     </div>
                   ))
               ) : (
                 <div className={`flex items-center justify-between p-4 rounded-xl border ${isNightMode ? 'bg-indigo-900/40 border-indigo-500' : 'bg-indigo-50 border-indigo-300'}`}>
                   <div className="flex items-center gap-4">
                     <span className="font-bold text-lg text-amber-500">#1</span>
                     <span className="font-bold text-indigo-600 dark:text-indigo-400">{playerName} (Ти)</span>
                   </div>
                   <span className="font-mono font-bold bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded text-sm">{points}</span>
                 </div>
               )}
               {!(sessionCode && sessionPlayers.length > 0) && (
                 <p className={`text-xs text-center ${isNightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                   Нема активна жива сесија со други играчи во моментов.
                 </p>
               )}
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
              <button type="button" aria-label="Затвори карта" onClick={() => setShowLiveMap(false)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700"><X className="w-5 h-5" /></button>
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
        <div className={`absolute top-20 right-4 font-mono font-bold text-xl ${isNightMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white/95 text-slate-700 border-slate-200'} px-4 py-1.5 rounded-xl border-2 shadow-lg z-50 transition-colors ${timeLeft <= 30 ? `text-red-500 border-red-500 animate-pulse ${isNightMode ? 'bg-red-900/20' : 'bg-red-50'}` : ''}`}>
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
          {stageLocked ? (
             <div className="flex-1 flex flex-col p-6 items-center justify-center text-center">
               <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
               <h2 className={`text-2xl font-bold ${isNightMode ? 'text-white' : 'text-slate-900'} mb-2`}>Оваа етапа е заклучена</h2>
               <p className={`${isNightMode ? 'text-slate-400' : 'text-slate-600'} mb-6`}>
                 {missingRequiredItem
                   ? `За да продолжиш, прво треба да го собереш предметот ${missingRequiredItem.icon ? `${missingRequiredItem.icon} ` : ''}${missingRequiredItem.name}.`
                   : 'Потребен е предмет за да се отвори оваа етапа.'}
               </p>
               {quest?.sequence === 'selectable' ? (
                 <button onClick={() => setIsSelectingStage(true)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase shadow-xl transition-all">
                   Избери друга етапа
                 </button>
               ) : (
                 <button onClick={handleExit} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold uppercase shadow-xl transition-all">
                   Излези од авантурата
                 </button>
               )}
             </div>
          ) : timeExpired && stage.type !== 'QUIZ' ? (
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

