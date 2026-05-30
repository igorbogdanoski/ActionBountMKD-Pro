import { useState } from 'react';
import { Check, Zap, Building2, Users, Star, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { SEO } from '../SEO';
import { PaymentModal } from './PaymentModal';
import type { PlanId } from 'shared';

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
  slate:  { border: 'border-slate-700',   badge: 'bg-slate-700 text-slate-200',  btn: 'bg-slate-700 hover:bg-slate-600 text-white',       btnActive: 'bg-slate-800 text-slate-400 cursor-default',        icon: 'text-slate-400' },
  indigo: { border: 'border-indigo-500',  badge: 'bg-indigo-500 text-white',     btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',      btnActive: 'bg-indigo-900/60 text-indigo-300 cursor-default',   icon: 'text-indigo-400' },
  emerald:{ border: 'border-emerald-500', badge: 'bg-emerald-500 text-white',    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',    btnActive: 'bg-emerald-900/60 text-emerald-300 cursor-default', icon: 'text-emerald-400' },
  amber:  { border: 'border-amber-500',   badge: 'bg-amber-500 text-slate-900',  btn: 'bg-amber-500 hover:bg-amber-400 text-slate-900',   btnActive: 'bg-amber-900/60 text-amber-300 cursor-default',     icon: 'text-amber-400' },
};

export function PricingPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { planId: currentPlan } = usePlan();
  const [modal, setModal] = useState<{ planId: 'starter' | 'pro'; planName: string } | null>(null);

  const handleCta = async (plan: Plan) => {
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:contact@avanturakreator.mk?subject=Enterprise план';
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

      {modal && (
        <PaymentModal
          planId={modal.planId}
          planName={modal.planName}
          onClose={() => setModal(null)}
        />
      )}

      <div className="min-h-screen bg-gray-950 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Едноставни цени,<br />
              <span className="text-indigo-400">без скриени трошоци</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
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
                  className={`relative flex flex-col rounded-2xl border ${c.border} bg-gray-900 p-6 ${
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
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-slate-400 text-sm ml-1">{plan.period}</span>}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
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

          {/* Payment methods note */}
          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm">
              Прифаќаме плаќање преку <span className="text-slate-300">банкарски трансфер (MKD)</span> и{' '}
              <span className="text-slate-300">PayPal</span>.
              Активација во рок од 24 часа.
            </p>
            <p className="text-slate-600 text-sm mt-2">
              Прашања?{' '}
              <a href="mailto:contact@avanturakreator.mk" className="text-indigo-400 hover:underline">
                contact@avanturakreator.mk
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

