/**
 * Client-safe dashboard types. Deliberately does NOT import from src/server/**
 * or src/db/** — those pull in better-sqlite3, a native module that must
 * never reach a client bundle. Only src/engine/** (pure) is safe to share.
 */
import type { LocationType, Parcel, ParcelStatus } from '../engine/types';

export interface ParcelRow extends Parcel {
  locationType: LocationType | null;
}

export interface ParcelFiltersState {
  carrier: string[];
  status: ParcelStatus[];
  recipient: string;
  department: string;
  /** 'custom' pairs with dateFrom/dateTo below — used by the NL search, which returns absolute dates rather than a preset. */
  datePreset: 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
  /** ISO-8601. Only meaningful when datePreset === 'custom'. */
  dateFrom: string;
  dateTo: string;
  locationType: LocationType | 'ALL';
  search: string;
}

export const EMPTY_FILTERS: ParcelFiltersState = {
  carrier: [],
  status: [],
  recipient: '',
  department: '',
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  locationType: 'ALL',
  search: '',
};

export const CARRIER_ORDER = ['DHL', 'UPS', 'GLS', 'Amazon', 'Internal Milkrun', 'Internal Transfer'];
