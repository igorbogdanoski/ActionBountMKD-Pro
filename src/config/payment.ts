export const PAYMENT_CONFIG = {
  paypalEmail: 'igor.bogdanoski@mismath.net',

  bank: {
    name:    'NLB Банка АД Скопје',
    account: '210-5015961024-57',
    iban:    'MK07 2105 0159 6102 457',
    bic:     'TUTNMK22',
    holder:  'Игор Богданоски',
  },

  plans: {
    starter: { mkd: 590,  eur: '9.60'  },
    pro:     { mkd: 1490, eur: '24.20' },
  },

  // Firebase UID — земи го од Firebase Console → Authentication → Users
  adminUids: ['REPLACE_WITH_YOUR_FIREBASE_UID'],

  contactEmail: 'igor.bogdanoski@mismath.net',
} as const;
