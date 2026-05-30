import { useEffect, useState } from 'react';
import { Check, X, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { getPaymentRequests, approvePaymentRequest, rejectPaymentRequest, type PaymentRequest } from '../../utils/paymentRequests';
import { PAYMENT_CONFIG } from '../../config/payment';
import { SEO } from '../SEO';
import type { PlanId } from '../../types';

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

export function AdminPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [filter, setFilter]     = useState<PaymentRequest['status'] | 'all'>('pending');

  const isAdmin = user && (PAYMENT_CONFIG.adminUids as readonly string[]).includes(user.uid);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPaymentRequests(filter === 'all' ? undefined : filter);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (req: PaymentRequest) => {
    setBusy(req.id);
    try {
      await approvePaymentRequest(req.id, req.userId, req.planId as PlanId);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const reject = async (req: PaymentRequest) => {
    setBusy(req.id);
    try {
      await rejectPaymentRequest(req.id);
      await load();
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
      <SEO title="Admin — Плаќања" description="" url="/admin" />
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Барања за плаќање</h1>
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Освежи
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s === 'all' ? 'Сите' : STATUS_LABELS[s].label}
              </button>
            ))}
          </div>

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
                  <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
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
                        <button
                          type="button"
                          onClick={() => approve(req)}
                          disabled={busy === req.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Одобри ({req.planId})
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(req)}
                          disabled={busy === req.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Одбиј
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
