import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, ShieldAlert, RefreshCw, BookOpen, Star, Loader2, Sprout, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { getPaymentRequests, approvePaymentRequest, rejectPaymentRequest, type PaymentRequest } from '../../utils/paymentRequests';
import { getAdminTemplates, saveTemplate } from '../../utils/storage';
import { runSeedTemplates, cleanupDuplicateTemplates } from '../../utils/seedTemplates';
import { SEO } from '../SEO';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import type { PlanId, Template } from 'shared';

const STATUS_LABELS: Record<PaymentRequest['status'], { label: string; cls: string }> = {
  pending:  { label: 'Чека',    cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  approved: { label: 'Одобрен', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Одбиен',  cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const METHOD_LABELS: Record<PaymentRequest['method'], string> = {
  paypal: 'PayPal',
  bank:   'Банка',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('mk-MK', { dateStyle: 'short', timeStyle: 'short' });
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedLog, setSeedLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<
    | { type: 'seed' }
    | { type: 'cleanup' }
    | { type: 'approve'; template: Template }
    | { type: 'reject'; template: Template }
    | null
  >(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await getAdminTemplates());
    } catch {
      setError('Шаблоните не може да се вчитаат. Обиди се повторно.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTemplates(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    setSeedLog([]);
    try {
      await runSeedTemplates(msg => setSeedLog(prev => [...prev, msg]));
      await loadTemplates();
      setConfirmation(null);
    } catch {
      setError('Стандардните шаблони не може да се додадат или освежат. Провери го логот и обиди се повторно.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanup = async () => {
    setSeeding(true);
    setError(null);
    try {
      await cleanupDuplicateTemplates(msg => setSeedLog(prev => [...prev, msg]));
      await loadTemplates();
      setConfirmation(null);
    } catch {
      setError('Дупликатите не може да се исчистат. Провери го логот и обиди се повторно.');
    } finally {
      setSeeding(false);
    }
  };

  const approve = async (tpl: Template) => {
    setBusy(tpl.id);
    setError(null);
    try {
      await saveTemplate({ ...tpl, status: 'approved', isPublic: true });
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      setConfirmation(null);
    } catch {
      setError(`Шаблонот „${tpl.title}“ не може да се одобри. Обиди се повторно.`);
    } finally { setBusy(null); }
  };

  const reject = async (tpl: Template) => {
    setBusy(tpl.id);
    setError(null);
    try {
      await saveTemplate({ ...tpl, status: 'rejected' });
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      setConfirmation(null);
    } catch {
      setError(`Шаблонот „${tpl.title}“ не може да се одбие. Обиди се повторно.`);
    } finally { setBusy(null); }
  };

  const toggleFeatured = async (tpl: Template) => {
    setBusy(tpl.id);
    setError(null);
    try {
      const updated = { ...tpl, isFeatured: !tpl.isFeatured };
      await saveTemplate(updated);
      setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t));
    } catch {
      setError(`Featured статусот за „${tpl.title}“ не може да се промени. Обиди се повторно.`);
    } finally { setBusy(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Вчитување...
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Seed section */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
              <Sprout className="w-4 h-4" /> Seed стандардни шаблони
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Додај 15 готови образовни шаблони (Математика, Природни науки, Историја, Јазици, Уметност, Туризам, Тимбилдинг) — вклучувајќи QR_TASK демоа — директно во библиотеката. Безбедно за повторно кликање (не прави дупликати).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => { setError(null); setConfirmation({ type: 'cleanup' }); }}
              disabled={seeding}
              size="sm" colorClassName="bg-slate-700 text-slate-200 hover:bg-slate-600 focus-visible:ring-slate-400"
              leftIcon={<X aria-hidden="true" className="w-3.5 h-3.5" />}
            >
              Исчисти дупликати
            </Button>
            <Button
              onClick={() => { setError(null); setConfirmation({ type: 'seed' }); }}
              disabled={seeding}
              size="sm" variant="success" leftIcon={<Sprout aria-hidden="true" className="w-3.5 h-3.5" />}
            >
              Seed шаблони
            </Button>
          </div>
        </div>
        {seedLog.length > 0 && (
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-1 max-h-32 overflow-y-auto">
            {seedLog.map((msg, i) => (
              <p key={i} className={`text-xs font-mono ${msg.startsWith('✓') ? 'text-emerald-400' : msg.startsWith('⚠') ? 'text-rose-400' : 'text-slate-400'}`}>
                {msg}
              </p>
            ))}
          </div>
        )}
      </div>

      {error && !confirmation && (
        <div role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Pending templates */}
      {loading ? (
        <div className="flex items-center justify-center h-20 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Вчитување...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-10 text-slate-600">
          <BookOpen className="w-8 h-8 mx-auto mb-2" />
          Нема шаблони на чекање за одобрување.
        </div>
      ) : (
      <div className="space-y-3">
      {templates.map(tpl => (
        <Card
          key={tpl.id}
          tone="dark"
          padded={false}
          data-testid="admin-template-card"
          className="!rounded-xl !bg-slate-900 !border-slate-800 !shadow-none p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-sm">{tpl.title}</p>
              <p className="text-xs text-slate-500">{tpl.authorName} · {tpl.subject} · {tpl.grade}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{tpl.difficulty}</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{tpl.stageCount} етапи</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">~{tpl.estimatedMinutes} мин</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">{tpl.description}</p>
          {tpl.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tpl.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1 flex-wrap">
            <Button
              aria-label={`Одобри и објави: ${tpl.title}`}
              onClick={() => { setError(null); setConfirmation({ type: 'approve', template: tpl }); }}
              disabled={busy === tpl.id}
              loading={busy === tpl.id} size="sm" variant="success"
              leftIcon={<Check aria-hidden="true" className="w-3.5 h-3.5" />}
            >
              Одобри и објави
            </Button>
            <Button
              aria-label={`Одбиј: ${tpl.title}`}
              onClick={() => { setError(null); setConfirmation({ type: 'reject', template: tpl }); }}
              disabled={busy === tpl.id}
              size="sm" variant="danger" leftIcon={<X aria-hidden="true" className="w-3.5 h-3.5" />}
            >
              Одбиј
            </Button>
            {tpl.status === 'approved' && (
              <Button
                aria-pressed={Boolean(tpl.isFeatured)}
                aria-label={`${tpl.isFeatured ? 'Отстрани' : 'Означи'} Featured: ${tpl.title}`}
                onClick={() => toggleFeatured(tpl)}
                disabled={busy === tpl.id}
                loading={busy === tpl.id} size="sm" leftIcon={<Star aria-hidden="true" className="w-3.5 h-3.5" />}
                colorClassName={
                  tpl.isFeatured
                    ? 'bg-yellow-600 text-white hover:bg-yellow-500 focus-visible:ring-yellow-500'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus-visible:ring-slate-400'
                }
              >
                {tpl.isFeatured ? 'Отстрани Featured' : 'Означи Featured'}
              </Button>
            )}
          </div>
        </Card>
      ))}
      </div>
      )}
      <Modal
        open={confirmation !== null}
        onClose={() => { if (!seeding && !busy) setConfirmation(null); }}
        title={confirmation?.type === 'seed'
          ? 'Додади стандардни шаблони?'
          : confirmation?.type === 'cleanup'
            ? 'Исчисти ги дупликатите?'
            : confirmation?.type === 'approve'
              ? 'Одобри и објави шаблон?'
              : 'Одбиј шаблон?'}
        size="sm"
        footer={confirmation && (
          <>
            <Button variant="secondary" onClick={() => setConfirmation(null)} disabled={seeding || busy !== null}>Откажи</Button>
            <Button
              variant={confirmation.type === 'reject' || confirmation.type === 'cleanup' ? 'danger' : 'success'}
              loading={seeding || (confirmation.type === 'approve' || confirmation.type === 'reject') && busy === confirmation.template.id}
              onClick={() => {
                if (confirmation.type === 'seed') void handleSeed();
                else if (confirmation.type === 'cleanup') void handleCleanup();
                else if (confirmation.type === 'approve') void approve(confirmation.template);
                else void reject(confirmation.template);
              }}
            >
              {confirmation.type === 'seed' ? 'Додади шаблони'
                : confirmation.type === 'cleanup' ? 'Исчисти дупликати'
                  : confirmation.type === 'approve' ? 'Одобри и објави' : 'Одбиј шаблон'}
            </Button>
          </>
        )}
      >
        {confirmation && (
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {confirmation.type === 'seed'
                ? 'Ќе се додадат или освежат 15 стандардни образовни шаблони во Firestore. Операцијата е безбедна за повторување.'
                : confirmation.type === 'cleanup'
                  ? 'Старите дупликати на стандардните шаблони ќе бидат трајно избришани според наслов.'
                  : confirmation.type === 'approve'
                    ? `Шаблонот „${confirmation.template.title}“ ќе стане јавно достапен во библиотеката.`
                    : `Шаблонот „${confirmation.template.title}“ ќе биде означен како одбиен.`}
            </p>
            {error && <p role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-rose-600 dark:text-rose-300">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<PaymentRequest['status'] | 'all'>('pending');
  const [activeTab, setActiveTab] = useState<'payments' | 'templates'>('payments');
  const [decision, setDecision] = useState<{ type: 'approve' | 'reject'; request: PaymentRequest } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPaymentRequests(filter === 'all' ? undefined : filter);
      setRequests(data);
    } catch {
      setError('Барањата за плаќање не може да се вчитаат. Обиди се повторно.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (req: PaymentRequest) => {
    setBusy(req.id);
    setError(null);
    try {
      await approvePaymentRequest(req.id, req.userId, req.planId as PlanId);
      await load();
      setDecision(null);
    } catch {
      setError(`Барањето од ${req.displayName} не може да се одобри. Провери дали веќе е обработено.`);
    } finally {
      setBusy(null);
    }
  };

  const reject = async (req: PaymentRequest) => {
    setBusy(req.id);
    setError(null);
    try {
      await rejectPaymentRequest(req.id);
      await load();
      setDecision(null);
    } catch {
      setError(`Барањето од ${req.displayName} не може да се одбие. Обиди се повторно.`);
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Мора да си најавен.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p>Немаш admin пристап.</p>
        <p className="text-xs text-slate-600">UID: {user.uid}</p>
      </div>
    );
  }

  return (
    <>
      <SEO title="Admin панел" description="" url="/admin" />
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/dashboard')}
                size="sm" colorClassName="bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white focus-visible:ring-slate-400"
                leftIcon={<ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />}
              >
                Назад
              </Button>
              <h1 className="text-xl font-bold">Admin панел</h1>
            </div>
            {activeTab === 'payments' && (
              <Button
                onClick={load}
                loading={loading} size="sm" colorClassName="bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white focus-visible:ring-slate-400"
                leftIcon={<RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />}
              >
                Освежи
              </Button>
            )}
          </div>

          {/* Main tabs */}
          <div role="tablist" aria-label="Admin секции" className="flex gap-2 border-b border-slate-800 pb-0">
            {([['payments', 'Плаќања'], ['templates', 'Шаблони']] as const).map(([tab, label]) => (
              <Button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                size="sm" colorClassName={`bg-transparent focus-visible:ring-indigo-500 ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`} className="rounded-none border-b-2 -mb-px px-4 py-2"
              >
                {label}
              </Button>
            ))}
          </div>

          {activeTab === 'templates' && <TemplatesTab />}

          {activeTab === 'payments' && <>
          {/* Filter tabs */}
          <div className="flex gap-2" aria-label="Филтер на плаќања">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
              <Button
                key={s}
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
                size="sm" colorClassName={
                  filter === s
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500'
                    : 'bg-slate-800 text-slate-400 hover:text-white focus-visible:ring-slate-400'
                }
              >
                {s === 'all' ? 'Сите' : STATUS_LABELS[s].label}
              </Button>
            ))}
          </div>

          {error && !decision && (
            <div role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Вчитување...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              Нема барања.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const st = STATUS_LABELS[req.status];
                return (
                  <Card
                    key={req.id}
                    tone="dark"
                    padded={false}
                    data-testid="admin-payment-card"
                    className="!rounded-xl !bg-slate-900 !border-slate-800 !shadow-none p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{req.displayName}</p>
                        <p className="text-xs text-slate-500">{req.userEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                          {req.planId}
                        </span>
                        <span className="text-[10px] text-slate-500">{METHOD_LABELS[req.method]}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><span className="text-slate-500">Износ:</span> <span className="text-slate-300">{req.amountMkd.toLocaleString('mk-MK')} MKD</span></div>
                      <div><span className="text-slate-500">Датум:</span> <span className="text-slate-300">{formatDate(req.createdAt)}</span></div>
                      <div className="col-span-2"><span className="text-slate-500">Трансакција:</span> <span className="text-slate-200 font-mono">{req.transactionRef}</span></div>
                      {req.note && <div className="col-span-2"><span className="text-slate-500">Белешка:</span> <span className="text-slate-300">{req.note}</span></div>}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          onClick={() => { setError(null); setDecision({ type: 'approve', request: req }); }}
                          disabled={busy === req.id}
                          size="sm" variant="success" leftIcon={<Check aria-hidden="true" className="w-3.5 h-3.5" />}
                        >
                          Одобри ({req.planId})
                        </Button>
                        <Button
                          onClick={() => { setError(null); setDecision({ type: 'reject', request: req }); }}
                          disabled={busy === req.id}
                          size="sm" variant="danger" leftIcon={<X aria-hidden="true" className="w-3.5 h-3.5" />}
                        >
                          Одбиј
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          </>}
        </div>
      </div>
      <Modal
        open={decision !== null}
        onClose={() => { if (!busy) setDecision(null); }}
        title={decision?.type === 'approve' ? 'Одобри плаќање?' : 'Одбиј плаќање?'}
        size="sm"
        footer={decision && (
          <>
            <Button variant="secondary" onClick={() => setDecision(null)} disabled={busy !== null}>Откажи</Button>
            <Button
              variant={decision.type === 'approve' ? 'success' : 'danger'}
              loading={busy === decision.request.id}
              onClick={() => void (decision.type === 'approve' ? approve(decision.request) : reject(decision.request))}
            >
              {decision.type === 'approve' ? `Одобри ${decision.request.planId}` : 'Одбиј барање'}
            </Button>
          </>
        )}
      >
        {decision && (
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {decision.type === 'approve'
                ? `Планот на ${decision.request.displayName} ќе биде променет во ${decision.request.planId}, а барањето ќе биде означено како одобрено.`
                : `Барањето од ${decision.request.displayName} ќе биде означено како одбиено.`}
            </p>
            <p className="font-mono text-xs text-slate-500">Трансакција: {decision.request.transactionRef}</p>
            {error && <p role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-rose-600 dark:text-rose-300">{error}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
