import type { Vehicle } from './types';

export const OUR_COMMISSION_EUR = 1000;
export const DISPLAYED_COMMISSION_EUR = 500;
export const DOCUMENTS_SURCHARGE_EUR = 350;
export const EXTRA_MARGIN_THRESHOLD_EUR = 10000;
export const EXTRA_MARGIN_RATE = 0.02;

const DOCUMENT_BASE_BY_COUNTRY: Record<string, number> = {
  AT: 468,
  BE: 448,
  DE: 448,
  DK: 408,
  ES: 534,
  FI: 368,
  FR: 418,
  IT: 628,
  NL: 474,
  PL: 278,
  PT: 408,
  SE: 461,
};

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (DOCUMENT_BASE_BY_COUNTRY[code]) return code;

  const byName: Record<string, string> = {
    AUSTRIA: 'AT',
    OOSTENRIJK: 'AT',
    BELGIUM: 'BE',
    BELGIË: 'BE',
    GERMANY: 'DE',
    DEUTSCHLAND: 'DE',
    DENMARK: 'DK',
    DÄNEMARK: 'DK',
    SPAIN: 'ES',
    ESPAÑA: 'ES',
    FINLAND: 'FI',
    FRANCE: 'FR',
    ITALY: 'IT',
    ITALIA: 'IT',
    NETHERLANDS: 'NL',
    POLAND: 'PL',
    POLSKA: 'PL',
    PORTUGAL: 'PT',
    SWEDEN: 'SE',
    SVERIGE: 'SE',
  };
  return byName[code] ?? null;
}

export function getVehicleCountryCode(vehicle: Vehicle): string | null {
  return (
    normalizeCountry(vehicle.current_location_country) ??
    normalizeCountry(vehicle.country_of_origin) ??
    normalizeCountry(vehicle.country_of_registration) ??
    null
  );
}

export function getDocumentsBaseEur(vehicle: Vehicle): number | null {
  const code = getVehicleCountryCode(vehicle);
  return code ? DOCUMENT_BASE_BY_COUNTRY[code] ?? null : null;
}

export function getDocumentsFeeEur(vehicle: Vehicle): number | null {
  const base = getDocumentsBaseEur(vehicle);
  return base === null ? null : base + DOCUMENTS_SURCHARGE_EUR;
}

export function getTransportEur(vehicle: Vehicle): number | null {
  const extended = vehicle as Vehicle & { transport_eur?: unknown; transport_price_eur?: unknown; transport?: unknown };
  const direct = num(extended.transport_eur) ?? num(extended.transport_price_eur) ?? num(extended.transport);
  if (direct !== null) return direct;

  const features = vehicle.features;
  if (features) {
    const keys = [
      'transport_eur',
      'transportPrice',
      'transport_price',
      'transportCostEur',
      'transportCost',
      'transportFee',
      'transportationCost',
      'transportationPrice',
      'logisticsCost',
      'deliveryCost',
      'deliveryPrice',
    ];

    for (const key of keys) {
      const candidate = num(features[key]);
      if (candidate !== null) return candidate;
    }

    const nested = [features.transport, features.transportation, features.logistics, features.delivery];
    for (const value of nested) {
      if (value && typeof value === 'object') {
        for (const key of keys) {
          const candidate = num((value as Record<string, unknown>)[key]);
          if (candidate !== null) return candidate;
        }
      }
    }
  }

  return null;
}

export function getBasePrice(vehicle: Vehicle): number | null {
  return num(vehicle.buy_now_price) ?? num(vehicle.search_price) ?? num(vehicle.minimum_bid);
}

export function getImportTotal(vehicle: Vehicle): number | null {
  const base = getBasePrice(vehicle);
  const docs = getDocumentsFeeEur(vehicle);
  const transport = getTransportEur(vehicle);
  if (base === null || docs === null || transport === null) return null;

  // Internal 2% margin for cars above €10,000, included in the displayed
  // purchase price but kept separate from the fixed €1,000 commission.
  const landedCost = base + docs + transport;
  const extraInternalMargin = base > EXTRA_MARGIN_THRESHOLD_EUR
    ? landedCost * EXTRA_MARGIN_RATE
    : 0;

  return landedCost + extraInternalMargin + OUR_COMMISSION_EUR;
}
