import { useState } from 'react';
import { CreditCard, Building2, Copy, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { submitPaymentRequest, type PaymentMethod } from '../../utils/paymentRequests';
import { PAYMENT_CONFIG } from '../../config/payment';
import type { PlanId } from 'shared';
import { Modal } from '../ui/Modal';

interface Props {
  planId: 'starter' | 'pro';
  planName: string;
  onClose: () => void;
}

type Step = 'method' | 'instructions' | 'confirm' | 'done';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 p-1 rounded text-slate-400 hover:text-white transition-colors shrink-0"
      title="Копирај"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-200 text-right font-mono break-all">{value}<CopyButton text={value} /></span>
    </div>
  );
}

export function PaymentModal({ planId, planName, onClose }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep]         = useState<Step>('method');
  const [method, setMethod]     = useState<PaymentMethod>('bank');
  const [txRef, setTxRef]       = useState('');
  const [note, setNote]         = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const plan  = PAYMENT_CONFIG.plans[planId];
  const bank  = PAYMENT_CONFIG.bank;
  const ref   = `AVK-${planId.toUpperCase()}-${(profile?.uid ?? user?.uid ?? 'USER').slice(0, 6).toUpperCase()}`;

  const handleSubmit = async () => {
    if (!txRef.trim()) { setErr('Внеси референтен број на трансакцијата.'); return; }
    if (!user || !profile) { setErr('Мора да си најавен.'); return; }
    setErr(null);
    setBusy(true);
    try {
      await submitPaymentRequest({
        userId:      user.uid,
        userEmail:   user.email ?? '',
        displayName: profile.displayName,
        planId:      planId as PlanId,
        method,
        amountMkd:   plan.mkd,
        transactionRef: txRef.trim(),
        note: note.trim() || undefined,
      });
      setStep('done');
    } catch {
      setErr('Грешка при испраќање. Обиди се повторно.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Купи план ${planName}`}>
      <p className="text-xs text-slate-400 -mt-2 mb-4">{plan.mkd.toLocaleString('mk-MK')} MKD / месец</p>

      <div className="space-y-5">

        {/* STEP 1: метод */}
        {step === 'method' && (
          <>
            <p className="text-sm text-slate-400">Избери начин на плаќање:</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'bank' as const,   icon: Building2,   label: 'Банкарски\nтрансфер', sub: 'MKD' },
                { id: 'paypal' as const, icon: CreditCard,  label: 'PayPal',               sub: 'EUR' },
              ] as const).map(({ id, icon: Icon, label, sub }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMethod(id); setStep('instructions'); }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group"
                >
                  <Icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-sm font-medium text-slate-200 whitespace-pre-line text-center leading-snug">{label}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: инструкции */}
        {step === 'instructions' && (
          <>
            {method === 'bank' && (
              <div className="space-y-1">
                <p className="text-xs text-slate-400 mb-3">
                  Направи уплата на следната сметка и запамти го бројот на трансакцијата:
                </p>
                <div className="bg-slate-800/60 rounded-xl px-4 py-1">
                  <Row label="Банка"   value={bank.name} />
                  <Row label="Сметка" value={bank.account} />
                  <Row label="IBAN"   value={bank.iban} />
                  <Row label="BIC"    value={bank.bic} />
                  <Row label="Примач" value={bank.holder} />
                  <Row label="Износ"  value={`${plan.mkd.toLocaleString('mk-MK')} MKD`} />
                  <Row label="Цел"    value={ref} />
                </div>
                <p className="text-[11px] text-amber-400/80 mt-2">
                  Задолжително напиши го кодот <strong>{ref}</strong> во полето „Цел на дознака".
                </p>
              </div>
            )}

            {method === 'paypal' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Испрати <strong className="text-white">{plan.eur} EUR</strong> на PayPal адресата подолу.
                  Во белешката напиши го кодот {ref}.
                </p>
                <div className="bg-slate-800/60 rounded-xl px-4 py-1">
                  <Row label="PayPal email" value={PAYMENT_CONFIG.paypalEmail} />
                  <Row label="Износ"        value={`${plan.eur} EUR`} />
                  <Row label="Белешка"      value={ref} />
                </div>
                <p className="text-[11px] text-slate-500">
                  Испрати пари на горниот email преку PayPal (Friends &amp; Family) и запамти го ID-от на трансакцијата.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors mt-1"
            >
              Веќе платив →
            </button>
            <button type="button" onClick={() => setStep('method')} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Назад
            </button>
          </>
        )}

        {/* STEP 3: потврда */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Внеси го референтниот број на трансакцијата за да ја потврдиме уплатата:
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Број на трансакција / PayPal ID *
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={e => setTxRef(e.target.value)}
                  placeholder="пр. 1AB23456CD789012E"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Белешка (опционално)
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Доплатна информација..."
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Испрати потврда
            </button>
            <button type="button" onClick={() => setStep('instructions')} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Назад
            </button>
          </div>
        )}

        {/* STEP 4: готово */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Барањето е примено!</h3>
              <p className="text-sm text-slate-400 mt-1">
                Ќе го активираме планот {planName} во рок од 24 часа по верификација на уплатата.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Прашања? Пиши на{' '}
              <a href={`mailto:${PAYMENT_CONFIG.contactEmail}`} className="text-indigo-400 hover:underline">
                {PAYMENT_CONFIG.contactEmail}
              </a>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
            >
              Затвори
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
