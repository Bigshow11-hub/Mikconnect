import axios, { AxiosInstance } from 'axios';

/**
 * DigHiConnect API client.
 *
 * Public spec for reverse-engineering — mikconnect mirrors DigHi's
 * data model for offers/vouchers/hotspots/bandwidth into our Prisma schema.
 *
 * Auth: X-API-Key header (live key in backend/.env, gitignored).
 * Format: DRF paginated {count,next,previous,results}.
 * Query-style filters: ?search=, ?hotspot=ID, ?page=, ?page_size=, ?is_active=.
 *
 * Field-type quirk: numbers may come as STRING or NUMBER depending on the
 * endpoint — use num() / str() helpers below when coercing.
 *
 * Discovery baseline (2026-06-29, all 21 endpoints returned 200):
 *   hotspots, offers, vouchers, bandwidth-profiles, resellers, monitoring-links,
 *   reseller-monitoring-links, hotspot-bonus-settings, consecutive-day-bonuses,
 *   winbox/whitelist, port-forward-rules, equipment-credentials, blocked-domains,
 *   block-packs, reminders, reminder-enrollments, messaging-availability,
 *   api-keys, investments, notification-configs, notification-logs
 */

interface DigHiConnectConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface DigHiConnectHotspot {
  id: number;
  name: string;
  ssid: string;
  router_ip: string;
  country: string;
  currency: string;
  is_public: boolean;
  is_active: boolean;
  auth_mode: 'radius' | 'api' | string;
  fedapay_public_key: string | null;
  public_uuid: string;
  public_token: string;
  is_owner: boolean;
  owner_subscription_active: boolean;
  is_subscription_active: boolean;
  max_connections: number | null;
  [k: string]: unknown;
}

export interface DigHiConnectVoucher {
  id: number;
  code: string;
  offer: number;
  status: string;
  status_display: string;
  voucher_type: 'paid' | 'generated' | string;
  voucher_type_display: string;
  auth_mode: string;
  transaction_id: string | null;
  transaction_amount: number | string | null;
  offer_name: string | null;
  duration_minutes: number | null;
  data_limit_mb: number | null;
  hotspot_id: number;
  hotspot_name: string;
  created_at: string;
  used_at: string | null;
  expires_at: string | null;
  [k: string]: unknown;
}

export interface DigHiConnectOffer {
  id: number;
  public_uuid: string;
  hotspot: number;
  name: string;
  duration_minutes: number | null;
  data_limit_mb: number | null;
  download_limit_mb: number | null;
  upload_limit_mb: number | null;
  price_fcfa: string | number | null;
  online_price_fcfa: string | number | null;
  wholesale_price_fcfa: string | number | null;
  wholesale_percentage: string | number | null;
  validity_hours: number | null;
  is_active: boolean;
  show_in_portal: boolean;
  bandwidth_profile: number | null;
  is_unlimited: boolean;
  server: string | null;
  [k: string]: unknown;
}

export interface DigHiConnectBandwidthProfile {
  id: number;
  name: string;
  download_speed: number | null;
  upload_speed: number | null;
  download_speed_display: string;
  upload_speed_display: string;
  speed_display: string;
  is_default: boolean;
  [k: string]: unknown;
}

export interface DigHiConnectMonitoringLink {
  id: number;
  token: string;
  name: string;
  hotspots: number[];
  hotspot_names: string;
  hotspot_count: number;
  include_sales_data: boolean;
  include_online_users: boolean;
  include_revenue_data: boolean;
  include_voucher_statistics: boolean;
  auto_refresh_interval: number;
  is_active: boolean;
  monitoring_url: string;
  access_count: number;
  expires_at: string | null;
  [k: string]: unknown;
}

export interface DigHiConnectApiKey {
  id: number;
  name: string;
  key_prefix: string;
  hotspot: number | null;
  hotspot_name: string | null;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  is_expired: boolean;
  last_used_at: string | null;
  usage_count: number;
  revoked_at: string | null;
  [k: string]: unknown;
}

export interface DigHiConnectPaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Coercion helpers — DigHi mixes string/number for prices and limits.
export const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
export const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

export class DigHiConnectService {
  private api: AxiosInstance;
  private baseUrl: string;

  constructor(config: DigHiConnectConfig) {
    this.baseUrl = config.baseUrl ?? 'https://dighiconnect.com/api';
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-Key': config.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 20_000,
    });
  }

  /** GET / — index of all available endpoints. */
  async listEndpoints(): Promise<Record<string, string>> {
    const { data } = await this.api.get<Record<string, string>>('/');
    return data;
  }

  /**
   * Generic paginated fetch — drives any endpoint listed in the index.
   * Pass the SLASH-STRIPPED key from listEndpoints(), e.g. "hotspots",
   * "vouchers", "offers". Returns ALL pages concatenated.
   */
  async listAll<T>(
    endpointKey: string,
    filters: Record<string, string | number | boolean | undefined> = {},
    maxPages = 10,
  ): Promise<DigHiConnectPaginated<T>> {
    const collected: T[] = [];
    let next: string | null = null;
    let pageCount = 0;
    let total = 0;

    const path = `/${endpointKey.replace(/^\/+|\/+$/g, '')}/`;
    // First request may live at base or include absolute next URL.
    const initialParams = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
    );
    const first: { data: DigHiConnectPaginated<T> } = await this.api.get(path, {
      params: { ...initialParams, page: 1, page_size: 100 },
    });
    collected.push(...first.data.results);
    total = first.data.count;
    next = first.data.next;
    pageCount = 1;

    while (next && pageCount < maxPages) {
      const r: { data: DigHiConnectPaginated<T> } = await this.api.get(next);
      collected.push(...r.data.results);
      next = r.data.next;
      pageCount += 1;
    }

    return { count: total, next, previous: null, results: collected };
  }

  /** Single-page fetch (caller controls pagination). */
  async listPage<T>(
    endpointKey: string,
    filters: Record<string, string | number | boolean | undefined> = {},
  ): Promise<DigHiConnectPaginated<T>> {
    const path = `/${endpointKey.replace(/^\/+|\/+$/g, '')}/`;
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
    );
    const { data } = await this.api.get<DigHiConnectPaginated<T>>(path, { params });
    return data;
  }

  async listHotspots(params: { search?: string; page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectHotspot>('hotspots', {
      search: params.search, page: params.page, page_size: params.pageSize,
    });
  }

  async findHotspotByName(name: string): Promise<DigHiConnectHotspot | null> {
    const res = await this.listHotspots({ search: name });
    return res.results[0] ?? null;
  }

  async listVouchers(params: { hotspot?: number; page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectVoucher>('vouchers', {
      hotspot: params.hotspot, page: params.page, page_size: params.pageSize,
    });
  }

  async listOffers(params: { hotspot?: number; page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectOffer>('offers', {
      hotspot: params.hotspot, page: params.page, page_size: params.pageSize,
    });
  }

  async listBandwidthProfiles(params: { page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectBandwidthProfile>('bandwidth-profiles', {
      page: params.page, page_size: params.pageSize,
    });
  }

  async listMonitoringLinks(params: { page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectMonitoringLink>('monitoring-links', {
      page: params.page, page_size: params.pageSize,
    });
  }

  async listApiKeys(params: { page?: number; pageSize?: number } = {}) {
    return this.listPage<DigHiConnectApiKey>('api-keys', {
      page: params.page, page_size: params.pageSize,
    });
  }
}

let _instance: DigHiConnectService | null = null;
export function getDigHiConnect(): DigHiConnectService {
  if (_instance) return _instance;
  const apiKey = process.env.DIGHICONNECT_API_KEY;
  if (!apiKey) throw new Error('DIGHICONNECT_API_KEY missing in env');
  _instance = new DigHiConnectService({
    apiKey,
    baseUrl: process.env.DIGHICONNECT_BASE_URL ?? 'https://dighiconnect.com/api',
  });
  return _instance;
}
