import { useEffect, useState } from 'react';
import { Check, X as XIcon, Clock, Zap, Building2, Users, Star, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { trackEvent } from '../../utils/analytics';
import { getUserPaymentRequests, type PaymentRequest } from '../../utils/paymentRequests';
import { SEO, PricingSchema, BreadcrumbSchema } from '../SEO';
import { PaymentModal } from './PaymentModal';
import { PLAN_LIMITS, type PlanId } from 'shared';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof Zap;
  color: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Бесплатен',
    price: '0',
    period: 'засекогаш',
    description: 'За пробување и мали проекти',
    icon: Star,
    color: 'slate',
    features: [
      '3 квестови',
      '10 етапи по квест',
      '20 играчи по квест',
      'GPS, QR, Квиз, Мисија',
      'Мобилен player',
    ],
    cta: 'Започни бесплатно',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '590',
    period: 'мес / MKD',
    description: 'За наставници и мали организации',
    icon: Zap,
    color: 'indigo',
    highlighted: true,
    features: [
      '15 квестови',
      '30 етапи по квест',
      '100 играчи по квест',
      'Сè од Бесплатен +',
      'AI генерирање слики',
      'CSV извоз на резултати',
      'Јавни квестови',
    ],
    cta: 'Земи Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '1.490',
    period: 'мес / MKD',
    description: 'За музеи, општини, компании',
    icon: Users,
    color: 'emerald',
    features: [
      '100 квестови',
      '80 етапи по квест',
      '500 играчи по квест',
      'Сè од Starter +',
      'Тимска колаборација',
      'Приоритетна поддршка',
      'Брендиран player',
    ],
    cta: 'Земи Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'По договор',
    period: '',
    description: 'За општини, туризам, образование',
    icon: Building2,
    color: 'amber',
    features: [
      'Неограничени квестови',
      'Неограничени играчи',
      'White-label решение',
      'SSO / LDAP',
      'Dedicated поддршка',
      'SLA гаранција',
    ],
    cta: 'Контактирај нè',
  },
];

const COLOR_MAP: Record<string, { border: string; badge: string; btn: string; btnActive: string; icon: string }> = {
  slate:  { border: 'border-slate-300 dark:border-slate-700',   badge: 'bg-slate-600 dark:bg-slate-700 text-white',  btn: 'bg-slate-700 hover:bg-slate-600 text-white',       btnActive: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default',        icon: 'text-slate-500 dark:text-slate-400' },
  indigo: { border: 'border-indigo-400 dark:border-indigo-500',  badge: 'bg-indigo-500 text-white',     btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',      btnActive: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 cursor-default',   icon: 'text-indigo-500 dark:text-indigo-400' },
  emerald:{ border: 'border-emerald-400 dark:border-emerald-500', badge: 'bg-emerald-500 text-white',    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',    btnActive: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 cursor-default', icon: 'text-emerald-500 dark:text-emerald-400' },
  amber:  { border: 'border-amber-400 dark:border-amber-500',   badge: 'bg-amber-500 text-slate-900',  btn: 'bg-amber-500 hover:bg-amber-400 text-slate-900',   btnActive: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 cursor-default',     icon: 'text-amber-500 dark:text-amber-400' },
};

// ─── Feature comparison table — derived from PLAN_LIMITS so it can never
// drift out of sync with the actual plan-gating logic in usePlan.ts ─────────

const fmtLimit = (n: number) => (n === -1 ? '∞' : String(n));

interface ComparisonRow {
  label: string;
  values: Record<PlanId, string | boolean>;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Квестови',
    values: Object.fromEntries(
      (Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, fmtLimit(PLAN_LIMITS[id].maxQuests)])
    ) as Record<PlanId, string>,
  },
  {
    label: 'Етапи по квест',
    values: Object.fromEntries(
      (Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, fmtLimit(PLAN_LIMITS[id].maxStagesPerQuest)])
    ) as Record<PlanId, string>,
  },
  {
    label: 'Играчи по квест',
    values: Object.fromEntries(
      (Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, fmtLimit(PLAN_LIMITS[id].maxPlayersPerQuest)])
    ) as Record<PlanId, string>,
  },
  {
    label: 'AI генерирање',
    values: Object.fromEntries((Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, PLAN_LIMITS[id].canUseAI])) as Record<PlanId, boolean>,
  },
  {
    label: 'CSV извоз на резултати',
    values: Object.fromEntries((Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, PLAN_LIMITS[id].canExportCSV])) as Record<PlanId, boolean>,
  },
  {
    label: 'Јавни квестови',
    values: Object.fromEntries((Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, PLAN_LIMITS[id].canGoPublic])) as Record<PlanId, boolean>,
  },
  {
    label: 'Тимска колаборација',
    values: Object.fromEntries((Object.keys(PLAN_LIMITS) as PlanId[]).map(id => [id, PLAN_LIMITS[id].canCollaborate])) as Record<PlanId, boolean>,
  },
  // Qualitative extras not modeled in PLAN_LIMITS (no runtime gate to drift from)
  { label: 'Брендиран player', values: { free: false, starter: false, pro: true, enterprise: true } },
  { label: 'Приоритетна поддршка', values: { free: false, starter: false, pro: true, enterprise: true } },
  { label: 'White-label решение', values: { free: false, starter: false, pro: false, enterprise: true } },
  { label: 'SSO / LDAP', values: { free: false, starter: false, pro: false, enterprise: true } },
  { label: 'SLA гаранција', values: { free: false, starter: false, pro: false, enterprise: true } },
];

function FeatureComparisonTable() {
  return (
    <div className="mt-16 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-gray-900">
            <th className="text-left font-bold text-slate-500 dark:text-slate-400 px-4 py-3 text-xs uppercase tracking-wider">Функција</th>
            {PLANS.map(plan => (
              <th key={plan.id} className="text-center font-bold text-slate-900 dark:text-white px-4 py-3">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => (
            <tr
              key={row.label}
              className={`border-t border-slate-200 dark:border-slate-800 ${i % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-slate-50 dark:bg-gray-900/50'}`}
            >
              <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{row.label}</td>
              {PLANS.map(plan => {
                const value = row.values[plan.id];
                return (
                  <td key={plan.id} className="px-4 py-3 text-center">
                    {typeof value === 'boolean' ? (
                      value ? (
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" aria-label="Достапно" />
                      ) : (
                        <XIcon className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" aria-label="Не е достапно" />
                      )
                    ) : (
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { planId: currentPlan } = usePlan();
  const [modal, setModal] = useState<{ planId: 'starter' | 'pro'; planName: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PaymentRequest | null>(null);

  const loadPendingRequest = () => {
    if (!user) { setPendingRequest(null); return; }
    getUserPaymentRequests(user.uid)
      .then(requests => setPendingRequest(requests.find(r => r.status === 'pending') ?? null))
      .catch(() => setPendingRequest(null));
  };

  useEffect(loadPendingRequest, [user]);

  const handleCta = async (plan: Plan) => {
    trackEvent('upgrade_click', {
      plan_id: plan.id,
      current_plan: currentPlan,
      authenticated: Boolean(user),
    });

    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:igor.bogdanoski@mismath.net?subject=Enterprise план';
      return;
    }
    if (plan.id === 'free') {
      navigate('/dashboard');
      return;
    }
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setModal({ planId: plan.id as 'starter' | 'pro', planName: plan.name });
  };

  return (
    <>
      <SEO
        title="Цени"
        description="Избери план за АвантураКреатор. Бесплатен план достапен. Starter од 590 MKD/мес, Pro од 1.490 MKD/мес."
        url="/pricing"
      />
      <PricingSchema />
      <BreadcrumbSchema items={[
        { name: 'Авантура МКД', url: '/' },
        { name: 'Цени', url: '/pricing' },
      ]} />

      {modal && (
        <PaymentModal
          planId={modal.planId}
          planName={modal.planName}
          onClose={() => { setModal(null); loadPendingRequest(); }}
        />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white py-20 px-4 transition-colors">
        <div className="max-w-6xl mx-auto">
          {pendingRequest && (
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-300">
                Барањето за <strong>{PLANS.find(p => p.id === pendingRequest.planId)?.name ?? pendingRequest.planId}</strong> план
                {' '}чека одобрување — ќе го активираме во рок од 24 часа по верификација на уплатата.
              </p>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Едноставни цени,<br />
              <span className="text-indigo-600 dark:text-indigo-400">без скриени трошоци</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Започни бесплатно. Надгради кога ќе пораснеш.
              Сите планови вклучуваат GPS, QR и квиз функции.
            </p>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {PLANS.map((plan) => {
              const c        = COLOR_MAP[plan.color];
              const Icon     = plan.icon;
              const isActive = currentPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border ${c.border} bg-white dark:bg-gray-900 p-6 ${
                    plan.highlighted ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10' : ''
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Најпопуларен
                      </span>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
                        <Crown className="w-3 h-3" /> Тековен
                      </span>
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.badge}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 dark:text-slate-400 text-sm ml-1">{plan.period}</span>}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${c.icon}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => !isActive && handleCta(plan)}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                      isActive ? c.btnActive : c.btn
                    }`}
                  >
                    {isActive ? '✓ Активен план' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Feature comparison table */}
          <FeatureComparisonTable />

          {/* Payment methods note */}
          <div className="mt-10 text-center">
            <p className="text-slate-500 dark:text-slate-500 text-sm">
              Прифаќаме плаќање преку <span className="text-slate-700 dark:text-slate-300">банкарски трансфер (MKD)</span> и{' '}
              <span className="text-slate-700 dark:text-slate-300">PayPal</span>.
              Активација во рок од 24 часа.
            </p>
            <p className="text-slate-500 dark:text-slate-600 text-sm mt-2">
              Прашања?{' '}
              <a href="mailto:igor.bogdanoski@mismath.net" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                igor.bogdanoski@mismath.net
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

