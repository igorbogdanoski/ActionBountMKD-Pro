export const PAYMENT_CONFIG = {
  paypalEmail: 'igor.bogdanoski@mismath.net',

  bank: {
    name:    'NLB Банка АД Скопје',
    account: '210-5015961024-57',
    swift:   'NBBAMK2X',
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
