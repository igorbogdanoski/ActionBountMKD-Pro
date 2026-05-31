import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Dimensions,
  KeyboardAvoidingView, Platform, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../utils/firebase';
import { useAuth } from '../../utils/AuthContext';

const progressKey = (questId: string) => `quest_progress_${questId}`;

const { width: SW } = Dimensions.get('window');

// ─── Haversine ───────────────────────────────────────────────────────────────
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Stage type icons ─────────────────────────────────────────────────────────
const STAGE_ICONS: Record<string, string> = {
  INFO: '📖', QUIZ: '❓', FIND_SPOT: '📍', MISSION: '📷',
  SCAN_CODE: '📱', QR_TASK: '🎯', SURVEY: '📝', TOURNAMENT: '🏆', SWITCH: '🔀',
};

export default function QuestPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [quest, setQuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [playerName, setPlayerName] = useState(user?.displayName || user?.email?.split('@')[0] || '');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [points, setPoints] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // Quiz
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<'success'|'error'|null>(null);
  const [timeLeft, setTimeLeft] = useState<number|null>(null);

  // GPS
  const [location, setLocation] = useState<{lat: number, lon: number}|null>(null);
  const [distance, setDistance] = useState<number|null>(null);
  const locationSub = useRef<Location.LocationSubscription|null>(null);

  // QR
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState('');
  const [qrTaskScanned, setQrTaskScanned] = useState(false);

  // Mission
  const [photoUri, setPhotoUri] = useState<string|null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front'|'back'>('back');

  // Survey
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ─── Load quest + resume progress ────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'quests', id as string))
      .then(async snap => {
        if (snap.exists()) {
          setQuest({ id: snap.id, ...snap.data() });
          // Resume saved progress
          const saved = await AsyncStorage.getItem(progressKey(id as string));
          if (saved) {
            const p = JSON.parse(saved);
            setCurrentIdx(p.currentIdx || 0);
            setPoints(p.points || 0);
            setCompletedIds(p.completedIds || []);
            setHasStarted(true);
            setPlayerName(p.playerName || '');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const stages: any[] = quest?.stages || [];
  const stage = stages[currentIdx];

  // ─── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage?.timeLimitSeconds > 0) {
      setTimeLeft(stage.timeLimitSeconds);
    } else {
      setTimeLeft(null);
    }
    setQuizFeedback(null);
    setQuizAnswer('');
    setScanned(false);
    setScanError('');
    setQrTaskScanned(false);
    setPhotoUri(null);
    setSurveyAnswers({});
  }, [currentIdx]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || quizFeedback) return;
    const t = setTimeout(() => setTimeLeft(p => (p ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, quizFeedback]);

  useEffect(() => {
    if (timeLeft === 0 && !quizFeedback) {
      setQuizFeedback('error');
      showToast('⏰ Времето истече!');
    }
  }, [timeLeft]);

  // ─── GPS for FIND_SPOT ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted || isFinished || stage?.type !== 'FIND_SPOT') {
      locationSub.current?.remove();
      locationSub.current = null;
      return;
    }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { showToast('GPS пристапот е одбиен'); return; }
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        pos => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude });
          if (stage?.targetCoordinates) {
            const d = getDistance(latitude, longitude, stage.targetCoordinates.latitude, stage.targetCoordinates.longitude);
            setDistance(d);
          }
        }
      );
    })();
    return () => { locationSub.current?.remove(); locationSub.current = null; };
  }, [hasStarted, isFinished, stage?.id]);

  // ─── Save progress ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !hasStarted || isFinished) return;
    AsyncStorage.setItem(progressKey(id as string), JSON.stringify({
      currentIdx, points, completedIds, playerName,
    }));
  }, [currentIdx, points, completedIds]);

  // ─── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = (overrideId?: string) => {
    if (!stage) return;
    const newCompleted = [...completedIds, stage.id];
    setCompletedIds(newCompleted);

    if (overrideId) {
      const idx = stages.findIndex(s => s.id === overrideId);
      if (idx !== -1) { setCurrentIdx(idx); return; }
    }

    const next = currentIdx + 1;
    if (next < stages.length) {
      setCurrentIdx(next);
    } else {
      finish(points, newCompleted);
    }
  };

  const finish = async (finalPoints: number, finalCompleted: string[]) => {
    setIsFinished(true);
    await AsyncStorage.removeItem(progressKey(id as string));
    await AsyncStorage.setItem(`quest_completed_${id}`, new Date().toISOString());
    try {
      await addDoc(collection(db, 'quest_results'), {
        questId: id,
        playerName,
        userId: user?.uid || null,
        points: finalPoints,
        completedStages: finalCompleted.length,
        totalStages: stages.length,
        completedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Save result error:', e);
    }
  };

  const submitQuiz = () => {
    if (!quizAnswer.trim()) return;
    const correct = String(stage.correctAnswer ?? '').trim().toLowerCase();
    const given = quizAnswer.trim().toLowerCase();
    if (given === correct) {
      setPoints(p => p + (stage.points || 0));
      setQuizFeedback('success');
      showToast(`✅ Точно! +${stage.points || 0} поени`);
      setTimeout(() => handleNext(), 1500);
    } else {
      setQuizFeedback('error');
      showToast('❌ Погрешно. Обиди се повторно.');
    }
  };

  const handleQRScan = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    if (data === stage.targetQrPayload) {
      if (stage.type === 'QR_TASK') {
        // Reveal the task; points are awarded after the answer
        setScanError('');
        setQrTaskScanned(true);
        showToast('✅ QR скениран! Реши ја задачата.');
      } else {
        setPoints(p => p + (stage.points || 0));
        showToast(`✅ QR скениран! +${stage.points || 0} поени`);
        setTimeout(() => handleNext(), 1000);
      }
    } else {
      setScanError('Погрешен QR код. Обиди се повторно.');
      setTimeout(() => { setScanError(''); setScanned(false); }, 2000);
    }
  };

  const submitQrTask = () => {
    const answerType: string = stage.answerType || 'text';
    const correct = String(stage.correctAnswer ?? '').trim();
    const autoGrade = answerType !== 'photo' && !!correct;

    if (answerType === 'photo') {
      if (!photoUri) { showToast('Прикачи фотографија'); return; }
    } else if (!quizAnswer.trim()) {
      showToast('Внеси одговор'); return;
    }

    // Manual grading (photo or no correct answer set) — always accept
    if (!autoGrade) {
      setPoints(p => p + (stage.points || 0));
      setQuizFeedback('success');
      showToast(`✅ Зачувано! +${stage.points || 0} поени`);
      setTimeout(() => handleNext(), 1200);
      return;
    }

    const isCorrect = quizAnswer.trim().toLowerCase() === correct.toLowerCase();
    if (isCorrect) {
      setPoints(p => p + (stage.points || 0));
      setQuizFeedback('success');
      showToast(`✅ Точно! +${stage.points || 0} поени`);
      setTimeout(() => handleNext(), 1500);
    } else {
      setQuizFeedback('error');
      showToast('❌ Погрешно. Обиди се повторно.');
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo) {
      setPhotoUri(photo.uri);
      setShowCamera(false);
    }
  };

  const submitMission = () => {
    if (!photoUri) return;
    setPoints(p => p + (stage.points || 0));
    showToast(`✅ Фото испратено! +${stage.points || 0} поени`);
    handleNext();
  };

  const submitSurvey = () => {
    const questions = stage.questions || [];
    const answered = Object.keys(surveyAnswers).filter(k => surveyAnswers[Number(k)]?.trim()).length;
    if (answered < questions.length) {
      showToast('Одговори на сите прашања');
      return;
    }
    setPoints(p => p + (stage.points || 0));
    handleNext();
  };

  const handleExit = () => {
    Alert.alert('Напушти авантура', 'Напредокот ќе биде зачуван. Можеш да продолжиш подоцна.', [
      { text: 'Откажи', style: 'cancel' },
      { text: 'Напушти', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const renderTimer = () => {
    if (timeLeft === null) return null;
    const pct = stage?.timeLimitSeconds ? timeLeft / stage.timeLimitSeconds : 1;
    const color = pct > 0.4 ? '#10b981' : pct > 0.2 ? '#f59e0b' : '#ef4444';
    return (
      <View style={styles.timerBox}>
        <View style={[styles.timerBar, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
        <Text style={[styles.timerText, { color }]}>⏱ {timeLeft}s</Text>
      </View>
    );
  };

  const renderMedia = () => {
    const mediaUrl = stage?.mediaUrl;
    if (!mediaUrl) return null;
    return <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="cover" />;
  };

  const renderStageContent = () => {
    if (!stage) return null;

    switch (stage.type) {

      // ─── INFO ──────────────────────────────────────────────────────────────
      case 'INFO':
        return (
          <View>
            {renderMedia()}
            <Text style={styles.stageDesc}>{stage.description}</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleNext()}>
              <Text style={styles.btnPrimaryText}>Продолжи →</Text>
            </TouchableOpacity>
          </View>
        );

      // ─── QUIZ ──────────────────────────────────────────────────────────────
      case 'QUIZ':
        return (
          <View>
            {renderMedia()}
            {renderTimer()}
            <Text style={styles.stageDesc}>{stage.description}</Text>
            {stage.options?.length > 0 ? (
              <View style={styles.optionsContainer}>
                {stage.options.map((opt: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.optionBtn,
                      quizAnswer === opt && styles.optionSelected,
                      quizFeedback === 'success' && quizAnswer === opt && styles.optionCorrect,
                      quizFeedback === 'error' && quizAnswer === opt && styles.optionWrong,
                    ]}
                    onPress={() => !quizFeedback && setQuizAnswer(opt)}
                    disabled={!!quizFeedback}
                  >
                    <Text style={[styles.optionText, quizAnswer === opt && styles.optionTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
                {quizAnswer && !quizFeedback && (
                  <TouchableOpacity style={styles.btnPrimary} onPress={submitQuiz}>
                    <Text style={styles.btnPrimaryText}>Потврди →</Text>
                  </TouchableOpacity>
                )}
                {quizFeedback === 'error' && !stage.requiredToAdvance && (
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => handleNext()}>
                    <Text style={styles.btnSecondaryText}>Прескокни →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                <TextInput
                  style={[styles.input, quizFeedback === 'error' && styles.inputError]}
                  placeholder="Твојот одговор..."
                  value={quizAnswer}
                  onChangeText={setQuizAnswer}
                  editable={!quizFeedback}
                  returnKeyType="done"
                  onSubmitEditing={submitQuiz}
                />
                {quizFeedback === 'error' && (
                  <View>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => { setQuizFeedback(null); setQuizAnswer(''); }}>
                      <Text style={styles.btnPrimaryText}>Обиди се повторно</Text>
                    </TouchableOpacity>
                    {!stage.requiredToAdvance && (
                      <TouchableOpacity style={styles.btnSecondary} onPress={() => handleNext()}>
                        <Text style={styles.btnSecondaryText}>Прескокни →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {!quizFeedback && (
                  <TouchableOpacity style={styles.btnPrimary} onPress={submitQuiz} disabled={!quizAnswer.trim()}>
                    <Text style={styles.btnPrimaryText}>Потврди →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );

      // ─── FIND_SPOT ─────────────────────────────────────────────────────────
      case 'FIND_SPOT':
        const arrived = distance !== null && distance < (stage.radiusMeters || 30);
        return (
          <View>
            {renderMedia()}
            <Text style={styles.stageDesc}>{stage.description}</Text>
            <View style={styles.gpsCard}>
              {distance === null ? (
                <View style={styles.gpsLoading}>
                  <ActivityIndicator color="#4f46e5" />
                  <Text style={styles.gpsLoadingText}>Поврзување со GPS...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.gpsDistance}>
                    {distance < 1000 ? `${Math.round(distance)} м` : `${(distance/1000).toFixed(1)} км`}
                  </Text>
                  <Text style={styles.gpsLabel}>до целта</Text>
                  <View style={[styles.gpsDot, arrived && styles.gpsDotArrived]} />
                  <Text style={[styles.gpsStatus, arrived && styles.gpsStatusArrived]}>
                    {arrived ? '✅ Стигна до целта!' : '📍 Оди кон целта'}
                  </Text>
                </>
              )}
            </View>
            {arrived && (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => { setPoints(p => p + (stage.points || 0)); handleNext(); }}>
                <Text style={styles.btnPrimaryText}>Потврди локација ✅</Text>
              </TouchableOpacity>
            )}
            {!arrived && distance !== null && (
              <TouchableOpacity style={styles.btnSecondary} onPress={() => handleNext()}>
                <Text style={styles.btnSecondaryText}>
                  {stage.requiredToAdvance ? '⚠️ Прескокни (тест)' : 'Прескокни →'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ─── SCAN_CODE ─────────────────────────────────────────────────────────
      case 'SCAN_CODE':
        if (!cameraPermission?.granted) {
          return (
            <View>
              <Text style={styles.stageDesc}>{stage.description}</Text>
              <Text style={styles.permText}>Потребна е дозвола за камера</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={requestCameraPermission}>
                <Text style={styles.btnPrimaryText}>Дозволи камера</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View>
            <Text style={styles.stageDesc}>{stage.description}</Text>
            {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
            <View style={styles.qrContainer}>
              <CameraView
                style={styles.qrCamera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleQRScan}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
              <View style={styles.qrOverlay}>
                <View style={styles.qrFrame} />
              </View>
            </View>
            <Text style={styles.qrHint}>Насочи ја камерата кон QR кодот</Text>
            {!stage.requiredToAdvance && (
              <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={() => handleNext()}>
                <Text style={styles.btnSecondaryText}>Прескокни →</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ─── QR_TASK ───────────────────────────────────────────────────────────
      case 'QR_TASK': {
        // Phase 1 — scan the QR code to reveal the task
        if (!qrTaskScanned) {
          if (!cameraPermission?.granted) {
            return (
              <View>
                <Text style={styles.stageDesc}>{stage.description}</Text>
                <Text style={styles.permText}>Потребна е дозвола за камера</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={requestCameraPermission}>
                  <Text style={styles.btnPrimaryText}>Дозволи камера</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View>
              <Text style={styles.stageDesc}>{stage.description}</Text>
              {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
              <View style={styles.qrContainer}>
                <CameraView
                  style={styles.qrCamera}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleQRScan}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />
                <View style={styles.qrOverlay}>
                  <View style={styles.qrFrame} />
                </View>
              </View>
              <Text style={styles.qrHint}>Скенирај го QR кодот за да ја откриеш задачата</Text>
            </View>
          );
        }

        // Phase 2 (photo answer) — fullscreen camera capture
        if (stage.answerType === 'photo' && showCamera) {
          if (!cameraPermission?.granted) {
            requestCameraPermission();
            return null;
          }
          return (
            <View style={styles.fullCamera}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
                  <Text style={styles.cancelBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}>
                  <Text style={styles.cancelBtnText}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        // Phase 2 — answer the revealed task
        return (
          <View>
            <Text style={styles.qrScannedBadge}>✅ QR скениран</Text>
            {stage.taskTitle ? <Text style={styles.qrTaskTitle}>{stage.taskTitle}</Text> : null}
            {stage.taskMediaUrl ? (
              <Image source={{ uri: stage.taskMediaUrl }} style={styles.media} resizeMode="cover" />
            ) : null}
            <Text style={styles.stageDesc}>{stage.taskDescription || stage.description}</Text>

            {/* Multiple choice */}
            {stage.answerType === 'multiple_choice' && (
              <View style={styles.optionsContainer}>
                {(stage.options || []).map((opt: string, i: number) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.optionBtn,
                      quizAnswer === opt && styles.optionSelected,
                      quizFeedback === 'success' && quizAnswer === opt && styles.optionCorrect,
                      quizFeedback === 'error' && quizAnswer === opt && styles.optionWrong,
                    ]}
                    onPress={() => !quizFeedback && setQuizAnswer(opt)}
                    disabled={!!quizFeedback}
                  >
                    <Text style={[styles.optionText, quizAnswer === opt && styles.optionTextSelected]}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Free text */}
            {stage.answerType === 'text' && (
              <TextInput
                style={[styles.input, quizFeedback === 'error' && styles.inputError]}
                placeholder="Внеси го твојот одговор..."
                value={quizAnswer}
                onChangeText={setQuizAnswer}
                editable={quizFeedback !== 'success'}
                multiline
              />
            )}

            {/* Photo proof */}
            {stage.answerType === 'photo' && (
              photoUri ? (
                <View>
                  <Image source={{ uri: photoUri }} style={styles.previewPhoto} resizeMode="cover" />
                  {quizFeedback !== 'success' && (
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhotoUri(null)}>
                      <Text style={styles.btnSecondaryText}>Слика повторно</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={() => setShowCamera(true)}>
                  <Text style={styles.photoBtnIcon}>📷</Text>
                  <Text style={styles.photoBtnText}>Сликај</Text>
                </TouchableOpacity>
              )
            )}

            {quizFeedback !== 'success' && (
              <TouchableOpacity style={styles.btnPrimary} onPress={submitQrTask}>
                <Text style={styles.btnPrimaryText}>Потврди →</Text>
              </TouchableOpacity>
            )}
            {quizFeedback === 'error' && !stage.requiredToAdvance && (
              <TouchableOpacity style={styles.btnSecondary} onPress={() => handleNext()}>
                <Text style={styles.btnSecondaryText}>Прескокни →</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }

      // ─── MISSION ───────────────────────────────────────────────────────────
      case 'MISSION':
        if (showCamera) {
          if (!cameraPermission?.granted) {
            requestCameraPermission();
            return null;
          }
          return (
            <View style={styles.fullCamera}>
              <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
                  <Text style={styles.cancelBtnText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}>
                  <Text style={styles.cancelBtnText}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        return (
          <View>
            {renderMedia()}
            <Text style={styles.stageDesc}>{stage.description}</Text>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={styles.previewPhoto} resizeMode="cover" />
                <TouchableOpacity style={styles.btnSecondary} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.btnSecondaryText}>Слика повторно</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={submitMission}>
                  <Text style={styles.btnPrimaryText}>Испрати фото →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoBtn} onPress={() => setShowCamera(true)}>
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Сликај</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      // ─── SURVEY ────────────────────────────────────────────────────────────
      case 'SURVEY':
        const questions: string[] = stage.surveyQuestions || stage.questions || [];
        return (
          <View>
            {renderMedia()}
            <Text style={styles.stageDesc}>{stage.description}</Text>
            {questions.map((q: string, i: number) => (
              <View key={i} style={styles.surveyItem}>
                <Text style={styles.surveyQuestion}>{i + 1}. {q}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Твојот одговор..."
                  value={surveyAnswers[i] || ''}
                  onChangeText={t => setSurveyAnswers(prev => ({ ...prev, [i]: t }))}
                  multiline
                />
              </View>
            ))}
            <TouchableOpacity style={styles.btnPrimary} onPress={submitSurvey}>
              <Text style={styles.btnPrimaryText}>Испрати одговори →</Text>
            </TouchableOpacity>
          </View>
        );

      // ─── SWITCH ────────────────────────────────────────────────────────────
      case 'SWITCH':
        const sw = stage;
        const evaluate = () => {
          for (const cond of (sw.conditions || [])) {
            const ok = (cond.minPoints === undefined || points >= cond.minPoints)
              && (cond.maxPoints === undefined || points <= cond.maxPoints)
              && (!cond.requiredStageIds?.length || cond.requiredStageIds.every((sid: string) => completedIds.includes(sid)));
            if (ok && cond.targetStageId) return cond.targetStageId;
          }
          return sw.defaultTargetStageId || null;
        };
        if (!sw.showPathsToPlayer) {
          const target = evaluate();
          if (target) handleNext(target);
          else handleNext();
          return null;
        }
        return (
          <View>
            <Text style={styles.stageDesc}>{sw.description || 'Избери патека:'}</Text>
            {(sw.conditions || []).map((cond: any, i: number) => (
              <TouchableOpacity key={i} style={styles.switchOption} onPress={() => handleNext(cond.targetStageId)}>
                <Text style={styles.switchOptionText}>{cond.label || `Патека ${i + 1}`}</Text>
                <Text style={styles.switchArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return (
          <View>
            <Text style={styles.stageDesc}>{stage.description}</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleNext()}>
              <Text style={styles.btnPrimaryText}>Продолжи →</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // ─── Screens ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Се вчитува авантурата…</Text>
      </View>
    );
  }

  if (!quest) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Авантурата не е пронајдена.</Text>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.back()}>
          <Text style={styles.btnPrimaryText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Finished screen
  if (isFinished) {
    return (
      <SafeAreaView style={styles.finishScreen}>
        <View style={styles.finishContent}>
          <Text style={styles.finishEmoji}>🏆</Text>
          <Text style={styles.finishTitle}>Честитки!</Text>
          <Text style={styles.finishName}>{playerName}</Text>
          <View style={styles.finishStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{points}</Text>
              <Text style={styles.statLabel}>Поени</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedIds.length}</Text>
              <Text style={styles.statLabel}>Етапи</Text>
            </View>
          </View>
          <Text style={styles.finishQuestTitle}>{quest.title}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.back()}>
            <Text style={styles.btnPrimaryText}>Назад кон главното мени</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <SafeAreaView style={styles.startScreen}>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
          <Text style={styles.exitBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.startContent}>
          <View style={styles.startIcon}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
          </View>
          <Text style={styles.startTitle}>{quest.title}</Text>
          {quest.description ? <Text style={styles.startDesc}>{quest.description}</Text> : null}
          <View style={styles.startMeta}>
            <Text style={styles.startMetaText}>📍 {stages.length} {stages.length === 1 ? 'етапа' : 'етапи'}</Text>
          </View>
          <Text style={styles.inputLabel}>Твоето име</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Внеси го твоето име..."
            value={playerName}
            onChangeText={setPlayerName}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.startBtn, !playerName.trim() && styles.startBtnDisabled]}
            onPress={() => setHasStarted(true)}
            disabled={!playerName.trim()}
          >
            <Text style={styles.startBtnText}>Започни Авантура  🚀</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera fullscreen (MISSION)
  if (showCamera) {
    return renderStageContent();
  }

  // Main player
  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.headerExit}>
          <Text style={styles.headerExitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{quest.title}</Text>
          <Text style={styles.headerSub}>
            Етапа {currentIdx + 1} / {stages.length}
          </Text>
        </View>
        <View style={styles.headerPoints}>
          <Text style={styles.headerPointsVal}>{points}</Text>
          <Text style={styles.headerPointsLabel}>поени</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIdx) / stages.length) * 100}%` as any }]} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {stage && (
            <>
              <View style={styles.stageTypeBadge}>
                <Text style={styles.stageTypeIcon}>{STAGE_ICONS[stage.type] || '📌'}</Text>
                <Text style={styles.stageTypeText}>{stage.type}</Text>
                {stage.points > 0 && <Text style={styles.stagePoints}>+{stage.points} поени</Text>}
              </View>
              <Text style={styles.stageTitle}>{stage.title || `Етапа ${currentIdx + 1}`}</Text>
              {renderStageContent()}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerExit: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  headerExitText: { fontSize: 14, color: '#6b7280', fontWeight: 'bold' },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  headerPoints: { alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  headerPointsVal: { fontSize: 18, fontWeight: '800', color: '#4f46e5' },
  headerPointsLabel: { fontSize: 10, color: '#6366f1', fontWeight: '600' },

  // Progress
  progressBar: { height: 4, backgroundColor: '#e2e8f0' },
  progressFill: { height: 4, backgroundColor: '#4f46e5', borderRadius: 2 },

  // Content
  content: { padding: 20, paddingBottom: 40 },
  stageTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  stageTypeIcon: { fontSize: 18 },
  stageTypeText: { fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' },
  stagePoints: { marginLeft: 'auto' as any, fontSize: 13, fontWeight: '700', color: '#4f46e5', backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  stageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16, lineHeight: 28 },
  stageDesc: { fontSize: 16, color: '#374151', lineHeight: 24, marginBottom: 20 },
  media: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },

  // Timer
  timerBox: { height: 32, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  timerBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8, opacity: 0.2 },
  timerText: { fontSize: 13, fontWeight: '700' },

  // Buttons
  btnPrimary: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  // Quiz options
  optionsContainer: { gap: 10 },
  optionBtn: { padding: 16, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  optionSelected: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  optionCorrect: { borderColor: '#10b981', backgroundColor: '#d1fae5' },
  optionWrong: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
  optionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  optionTextSelected: { color: '#4f46e5', fontWeight: '700' },

  // Input
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827', marginBottom: 8 },
  inputError: { borderColor: '#ef4444' },

  // GPS
  gpsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gpsLoadingText: { color: '#6b7280', fontSize: 14 },
  gpsDistance: { fontSize: 48, fontWeight: '800', color: '#4f46e5' },
  gpsLabel: { fontSize: 14, color: '#9ca3af', marginBottom: 12 },
  gpsDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f59e0b', marginBottom: 8 },
  gpsDotArrived: { backgroundColor: '#10b981' },
  gpsStatus: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  gpsStatusArrived: { color: '#10b981' },

  // QR
  qrContainer: { width: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 12 },
  qrCamera: { flex: 1 },
  qrOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  qrFrame: { width: 200, height: 200, borderWidth: 3, borderColor: '#4f46e5', borderRadius: 16, backgroundColor: 'transparent' },
  qrHint: { textAlign: 'center', color: '#9ca3af', fontSize: 13 },
  permText: { color: '#6b7280', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  qrScannedBadge: { alignSelf: 'flex-start', color: '#0d9488', backgroundColor: '#ccfbf1', fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  qrTaskTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },

  // Mission
  photoBtn: { height: 160, backgroundColor: '#eef2ff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#c7d2fe', borderStyle: 'dashed', marginBottom: 16 },
  photoBtnIcon: { fontSize: 40, marginBottom: 8 },
  photoBtnText: { fontSize: 16, color: '#4f46e5', fontWeight: '600' },
  previewPhoto: { width: '100%', height: 240, borderRadius: 16, marginBottom: 12 },
  fullCamera: { flex: 1, backgroundColor: '#000' },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4f46e5' },
  cancelBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Survey
  surveyItem: { marginBottom: 16 },
  surveyQuestion: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },

  // Switch
  switchOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 10 },
  switchOptionText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  switchArrow: { fontSize: 18, color: '#4f46e5' },

  // Start screen
  startScreen: { flex: 1, backgroundColor: '#f0f4ff' },
  exitBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  exitBtnText: { fontSize: 14, color: '#6b7280', fontWeight: 'bold' },
  startContent: { flex: 1, justifyContent: 'center', padding: 24 },
  startIcon: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, alignSelf: 'center' },
  startTitle: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  startDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  startMeta: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  startMetaText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  nameInput: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#c7d2fe', borderRadius: 14, padding: 16, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20, color: '#111827' },
  startBtn: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center' },
  startBtnDisabled: { backgroundColor: '#c7d2fe' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Finish screen
  finishScreen: { flex: 1, backgroundColor: '#4f46e5' },
  finishContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  finishEmoji: { fontSize: 72, marginBottom: 16 },
  finishTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4 },
  finishName: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 32 },
  finishStats: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 20, borderRadius: 20, alignItems: 'center', minWidth: 100 },
  statValue: { fontSize: 36, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  finishQuestTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 32, textAlign: 'center' },

  // Toast
  toast: { position: 'absolute', bottom: 32, left: 20, right: 20, backgroundColor: '#1e293b', padding: 14, borderRadius: 14, alignItems: 'center' },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
