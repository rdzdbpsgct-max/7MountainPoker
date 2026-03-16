import type { PayoutEntry } from './types';

export interface PayoutTemplate {
  id: string;
  label: string;
  entries: PayoutEntry[];
}

export const PAYOUT_TEMPLATES: PayoutTemplate[] = [
  {
    id: 'top-heavy',
    label: 'payout.template.topHeavy',
    entries: [
      { place: 1, value: 60 },
      { place: 2, value: 25 },
      { place: 3, value: 15 },
    ],
  },
  {
    id: 'standard',
    label: 'payout.template.standard',
    entries: [
      { place: 1, value: 50 },
      { place: 2, value: 30 },
      { place: 3, value: 20 },
    ],
  },
  {
    id: 'flat',
    label: 'payout.template.flat',
    entries: [
      { place: 1, value: 40 },
      { place: 2, value: 30 },
      { place: 3, value: 20 },
      { place: 4, value: 10 },
    ],
  },
  {
    id: 'deep',
    label: 'payout.template.deep',
    entries: [
      { place: 1, value: 35 },
      { place: 2, value: 25 },
      { place: 3, value: 18 },
      { place: 4, value: 13 },
      { place: 5, value: 9 },
    ],
  },
];
