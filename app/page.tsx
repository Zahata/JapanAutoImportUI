'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import type { Vehicle, VehicleImage } from '../lib/types';
import { OUR_COMMISSION_EUR, getImportTotal } from '../lib/pricing';

const PAGE_SIZE = 24;
const JAPANESE_BRANDS = ['Toyota', 'Lexus', 'Honda', 'Mazda', 'Nissan', 'Mitsubishi', 'Subaru', 'Suzuki', 'Infiniti'];
const FUEL_OPTIONS: Array<[string,string]> = [['hybrid','Хибрид'],['petrol','Бензин'],['diesel','Дизел'],['electric','Електрически'],['plug_in_hybrid','Plug-in хибрид']];
const GEARBOX_OPTIONS: Array<[string,string]> = [['automatic','Автоматик'],['manual','Ръчна']];
const BODY_OPTIONS: Array<[string,string]> = [['SUV','SUV'],['Hatchback','Хечбек'],['Sedan','Седан'],['Wagon','Комби'],['Estate','Комби'],['Coupe','Купе'],['Convertible','Кабрио'],['MPV','MPV']];
const COUNTRY_OPTIONS: Array<[string,string]> = [['AT','Австрия (AT)'],['BE','Белгия (BE)'],['DE','Германия (DE)'],['DK','Дания (DK)'],['ES','Испания (ES)'],['FI','Финландия (FI)'],['FR','Франция (FR)'],['IT','Италия (IT)'],['NL','Нидерландия (NL)'],['PL','Полша (PL)'],['PT','Португалия (PT)'],['SE','Швеция (SE)']];
const YEARS = Array.from({length: 16}, (_, i) => String(2025 - i));
type VehicleOption = { make: string | null; model: string | null; main_type: string | null; stock_number: string | null };

function euro(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}
function number(value: number | null) {
  return value === null ? '—' : new Intl.NumberFormat('bg-BG').format(value);
}
function fuel(value: string | null) {
  const map: Record<string, string> = { hybrid: 'Хибрид', petrol: 'Бензин', diesel: 'Дизел', electric: 'Електрически', plug_in_hybrid: 'Plug-in хибрид' };
  return value ? (map[value.toLowerCase()] ?? value) : '—';
}
function gear(value: string | null) {
  const map: Record<string, string> = { automatic: 'Автоматик', manual: 'Ръчна' };
  return value ? (map[value.toLowerCase()] ?? value) : '—';
}

// Keep only the model name and engine displacement in the model dropdown.
// Examples: "Auris 1.3 Cool" -> "Auris 1.3"; "Q60 3.0 V6 Sport Tech AWD" -> "Q60 3.0".
function modelDropdownLabel(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/\b\d+[.,]\d+(?:\s*[Ll])?\b|\b\d+\s*[Ll]\b/i);
  if (!match || match.index === undefined) return normalized;
  return `${normalized.slice(0, match.index + match[0].length)}`.trim();
}

export default function HomePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [images, setImages] = useState<Record<string, VehicleImage>>({});
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [brand, setBrand] = useState('Всички');
  const [model, setModel] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('last_seen_at.desc');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [mileageTo, setMileageTo] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [country, setCountry] = useState('');
  const [minPower, setMinPower] = useState('');
  const [minSeats, setMinSeats] = useState('');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem('jai-favorites') ?? '[]'));
    } catch {
      setFavorites([]);
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filtersActive = Boolean((brand && brand !== 'Всички') || model || query || yearFrom || yearTo || priceFrom || priceTo || mileageTo || fuelType || gearbox || bodyType || country || minPower || minSeats);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pageSize = 1000;
      const collected: VehicleOption[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from('vehicles')
          .select('make,model,main_type,stock_number')
          .eq('status', 'active')
          .range(offset, offset + pageSize - 1);
        if (error || !data?.length) break;
        collected.push(...((data as VehicleOption[]) ?? []));
        if (data.length < pageSize) break;
      }
      if (!cancelled) setVehicleOptions(collected);
    })();
    return () => { cancelled = true; };
  }, []);

  const modelOptions = useMemo(() => {
    const source = brand === 'Всички' ? vehicleOptions : vehicleOptions.filter(v => (v.make ?? '') === brand);
    const seenLabels = new Set<string>();
    return source
      .map(v => {
        const raw = (v.model || v.main_type || '').trim();
        return raw ? { value: raw, label: modelDropdownLabel(raw) } : null;
      })
      .filter((v): v is { value: string; label: string } => Boolean(v))
      .filter(v => {
        const key = v.label.toLocaleLowerCase('bg');
        if (seenLabels.has(key)) return false;
        seenLabels.add(key);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'bg'));
  }, [brand, vehicleOptions]);

  const modelLabels = useMemo(() => new Set(modelOptions.map(option => option.label)), [modelOptions]);

  useEffect(() => {
    if (model && !modelLabels.has(model)) setModel('');
  }, [model, modelLabels]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let req = supabase.from('vehicles').select('*', { count: 'exact' }).eq('status', 'active');
      if (brand !== 'Всички') req = req.eq('make', brand);
      if (model) {
        const modelPattern = model.replace(/[%_]/g, m => `\\${m}`);
        req = req.or(`model.ilike.${modelPattern}%,main_type.eq.${model}`);
      }
      const q = query.trim();
      if (q) req = req.ilike('stock_number', `%${q}%`);
      if (yearFrom) req = req.gte('year', Number(yearFrom));
      if (yearTo) req = req.lte('year', Number(yearTo));
      if (fuelType) req = req.eq('fuel_type', fuelType);
      if (gearbox) req = req.eq('gearbox', gearbox);
      if (country) req = req.eq('current_location_country', country);
      if (bodyType) req = req.ilike('body_type', `%${bodyType}%`);
      if (mileageTo) req = req.lte('mileage_km', Number(mileageTo));
      if (minPower) req = req.gte('power_hp', Number(minPower));
      if (minSeats) req = req.gte('seats', Number(minSeats));
      if (priceFrom) req = req.gte('search_price', Number(priceFrom));
      if (priceTo) req = req.lte('search_price', Number(priceTo));
      const [col, dir] = sort.split('.') as ['last_seen_at' | 'search_price' | 'year' | 'mileage_km', 'asc' | 'desc'];
      const res = await req.order(col, { ascending: dir === 'asc', nullsFirst: false }).range(from, to);
      if (cancelled) return;
      if (res.error) setError(res.error.message);
      setVehicles((res.data as Vehicle[]) ?? []);
      setCount(res.count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [brand, model, query, sort, yearFrom, yearTo, priceFrom, priceTo, mileageTo, fuelType, gearbox, bodyType, country, minPower, minSeats, page]);

  useEffect(() => {
    (async () => {
      if (!vehicles.length) return;
      const ids = vehicles.map(v => v.id);
      const { data } = await supabase.from('vehicle_images').select('*').in('vehicle_id', ids).eq('is_document', false).order('sort_order', { ascending: true });
      const map: Record<string, VehicleImage> = {};
      for (const img of (data as VehicleImage[]) ?? []) if (!map[img.vehicle_id]) map[img.vehicle_id] = img;
      setImages(map);
    })();
  }, [vehicles]);

  function clearFilters() {
    setBrand('Всички');
    setModel('');
    setQuery('');
    setYearFrom(''); setYearTo('');
    setPriceFrom(''); setPriceTo('');
    setMileageTo('');
    setFuelType('');
    setGearbox('');
    setBodyType(''); setCountry(''); setMinPower(''); setMinSeats('');
    setSort('last_seen_at.desc');
    setPage(0);
  }

  function toggleFavorite(id: string) {
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      localStorage.setItem('jai-favorites', JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="site">
      <main className="container">
        <section className="hero">
          <div className="hero-copy">
            <div className="kicker">ИЗБРАНИ ЯПОНСКИ МАРКИ</div>
            <h1>Намери автомобила.<br /><em>Ние ще го внесем.</em></h1>
            <p>Реални обяви, актуализирани автоматично. Разглеждай спокойно и виж предварително как се формира крайната цена за внос.</p>
            <div className="hero-actions">
              <a href="#cars" className="hero-primary">Разгледай наличните автомобили <span>→</span></a>
              <button type="button" className="hero-secondary" onClick={() => document.getElementById('price-guide')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Как се формира цената</button>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat stat-single"><b>{count.toLocaleString('bg-BG')}</b><span>активни обяви</span></div>
          </div>
        </section>

        <section className="trust-strip" id="how">
          <div><span className="trust-icon">01</span><div><b>Реални данни</b><small>Актуализират се автоматично</small></div></div>
          <div><span className="trust-icon">02</span><div><b>Прозрачна крайна цена</b><small>Документи + транспорт + комисионна</small></div></div>
          <div><span className="trust-icon">03</span><div><b>Подбран инвентар</b><small>Само японски марки</small></div></div>
        </section>

        <section id="cars" className="content-grid">
          <aside className={`filters ${mobileFiltersOpen ? 'mobile-open' : ''}`}>
            <div className="filters-head"><div><span className="filters-overline">Търсене</span><h3>Филтри</h3></div><button className="clear" onClick={clearFilters}>Изчисти</button></div>

            <div className="filter-stock-row">
              <label className="field-control">
                <span className="filter-label">Stock №</span>
                <input className="number-field stock-filter" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Напр. CZ60488" />
              </label>
            </div>

            <div className="filter-row filter-make-model">
              <SelectField label="Марка" value={brand} onChange={v => { setBrand(v); setModel(''); setPage(0); }} options={[['Всички','Всички'], ...JAPANESE_BRANDS.map(b => [b,b] as [string,string])] as Array<[string,string]>} pairs />
              <SelectField label="Модел" value={model} onChange={v => { setModel(v); setPage(0); }} options={[['','Всички'], ...modelOptions.map(option => [option.label, option.label] as [string,string])] as Array<[string,string]>} pairs />
            </div>

            <div className="filter-row">
              <SelectField label="От година" value={yearFrom} onChange={v => { setYearFrom(v); setPage(0); }} options={['', ...YEARS]} />
              <SelectField label="До година" value={yearTo} onChange={v => { setYearTo(v); setPage(0); }} options={['', ...YEARS]} />
            </div>

            <div className="filter-row">
              <SelectField label="Гориво" value={fuelType} onChange={v => { setFuelType(v); setPage(0); }} options={[['','Всички'], ...FUEL_OPTIONS] as Array<[string, string]>} pairs />
              <SelectField label="Скоростна кутия" value={gearbox} onChange={v => { setGearbox(v); setPage(0); }} options={[['','Всички'], ...GEARBOX_OPTIONS] as Array<[string, string]>} pairs />
            </div>

            <SelectField label="Тип купе" value={bodyType} onChange={v => { setBodyType(v); setPage(0); }} options={[['','Всички'], ...BODY_OPTIONS] as Array<[string, string]>} pairs />
            <SelectField label="Държава на автомобила" value={country} onChange={v => { setCountry(v); setPage(0); }} options={[['','Всички'], ...COUNTRY_OPTIONS] as Array<[string, string]>} pairs />

            <div className="filter-row">
              <NumberField label="Покупна цена от (€)" value={priceFrom} onChange={v => { setPriceFrom(v); setPage(0); }} placeholder="0" />
              <NumberField label="Покупна цена до (€)" value={priceTo} onChange={v => { setPriceTo(v); setPage(0); }} placeholder="50 000" />
            </div>
            <NumberField label="Макс. пробег (км)" value={mileageTo} onChange={v => { setMileageTo(v); setPage(0); }} placeholder="200 000" />
            <div className="filter-row">
              <NumberField label="Мин. мощност (к.с.)" value={minPower} onChange={v => { setMinPower(v); setPage(0); }} placeholder="100" />
              <NumberField label="Мин. места" value={minSeats} onChange={v => { setMinSeats(v); setPage(0); }} placeholder="4" />
            </div>

            {mobileFiltersOpen && <button className="apply-filters" onClick={() => setMobileFiltersOpen(false)}>Покажи {count.toLocaleString('bg-BG')} автомобила</button>}
          </aside>

          <div className="inventory-wrap">
            <div className="inventory-head">
              <div className="inventory-title"><div className="section-eyebrow">КАТАЛОГ</div><h2>Автомобили</h2><p>{filtersActive ? 'Филтрирани резултати от нашата база' : 'Избрани японски марки · актуални данни'}</p></div>
              <div className="head-controls">
                <button className="mobile-filter-trigger" type="button" onClick={() => setMobileFiltersOpen(v => !v)} aria-label="Отвори филтрите" aria-expanded={mobileFiltersOpen}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                </button>
                <select className="sort" value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="last_seen_at.desc">Последно обновени</option><option value="search_price.asc">Цена: ниска → висока</option><option value="search_price.desc">Цена: висока → ниска</option><option value="year.desc">Най-нови</option></select>
              </div>
            </div>

            <div className="results-row"><span><strong>{count.toLocaleString('bg-BG')}</strong> резултата</span><span>Страница <strong>{page + 1}</strong> от <strong>{totalPages}</strong></span></div>

            {error ? <div className="error">Не успяхме да заредим автомобилите: {error}</div> : loading ? <div className="loading"><div className="spinner"></div><b>Зареждаме актуалните автомобили…</b><span>Свързваме се с базата</span></div> : <>
              {vehicles.length > 0 && <section className="cards">{vehicles.map(v => <VehicleCard key={v.id} vehicle={v} image={images[v.id]} favorite={favorites.includes(v.id)} onFavorite={toggleFavorite} />)}</section>}
              {!vehicles.length && <div className="empty"><div className="empty-icon">⌕</div><h3>Няма намерени автомобили</h3><p>Промени филтрите или търсенето, за да видиш повече резултати.</p><button onClick={clearFilters}>Изчисти всички филтри</button></div>}
              <div className="pagination"><button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Предишна</button><span className="page-count">{page + 1} / {totalPages}</span><button disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>Следваща →</button></div>
            </>}

            <section id="price-guide" className="transparency-banner">
              <div><span className="banner-kicker">ЯСНА КРАЙНА ЦЕНА</span><h3>Виждаш крайната цена още преди да заявиш автомобила.</h3><p>Всички разходи по вноса са включени във финалната сума. Нашата фиксирана комисионна е €1 000.</p></div>
              <div className="banner-total"><span>Нашата комисионна</span><b>€1 000</b></div>
            </section>

            <footer className="footer">Крайната цена за клиента включва всички изчислени разходи по вноса и <b>€1 000 фиксирана комисионна</b>. Няма скрити посреднически такси.</footer>
          </div>
        </section>
      </main>
    </div>
  );
}


function SelectField({
  label,
  value,
  onChange,
  options,
  pairs = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<[string, string]>;
  pairs?: boolean;
}) {
  const normalized: Array<{ value: string; label: string }> = pairs
    ? (options as Array<[string, string]>).map(([v, l]) => ({ value: v, label: l }))
    : (options as string[]).map((v) => ({ value: v, label: v || 'Всички' }));

  return (
    <label className="field-control">
      <span className="filter-label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {normalized.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field-control">
      <span className="filter-label">{label}</span>
      <input
        className="number-field"
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function AuctionCountdown({ endAt }: { endAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endAt) {
      setRemaining(null);
      return;
    }

    const target = new Date(endAt).getTime();
    if (!Number.isFinite(target)) {
      setRemaining(null);
      return;
    }

    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endAt]);

  if (remaining === null) return <span className="pill">НАЛИЧНА</span>;

  if (remaining <= 0) {
    return <span className="auction-pill auction-ended">ТЪРГЪТ ПРИКЛЮЧИ</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = days > 0
    ? `${days}д ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return <span className="auction-pill auction-countdown" aria-label={`Оставащо време до края на търга: ${clock}`}>
    <span className="countdown-dot" aria-hidden="true"></span> {clock}
  </span>;
}

function VehicleCard({ vehicle, image, favorite, onFavorite }: { vehicle: Vehicle; image?: VehicleImage; favorite: boolean; onFavorite: (id: string) => void }) {
  const total = getImportTotal(vehicle);
  const price = total === null ? null : total - OUR_COMMISSION_EUR;
  return (
    <article className="card">
      <Link href={`/vehicles/${encodeURIComponent(vehicle.id)}`} className="photo-link" aria-label={`Виж ${vehicle.make} ${vehicle.model ?? ''}`}>
        <div className="photo">
          {image?.absolute_url ? <img src={image.absolute_url} alt={`${vehicle.make} ${vehicle.model ?? ''}`} loading="lazy" /> : <div className="no-photo"><span>НЯМА СНИМКА</span><small>Очакваме данни</small></div>}
          <AuctionCountdown endAt={vehicle.auction_end_at} />
        </div>
      </Link>
      <div className="card-body">
        <div className="maker-line"><span>{vehicle.make}</span><span className="stock">{vehicle.stock_number}</span></div>
        <div className="card-title-row"><Link href={`/vehicles/${encodeURIComponent(vehicle.id)}`}><h3>{vehicle.model || vehicle.main_type || 'Автомобил'}</h3></Link><button className={`favorite ${favorite ? 'is-favorite' : ''}`} aria-label={favorite ? 'Премахни от любими' : 'Добави в любими'} onClick={() => onFavorite(vehicle.id)}>{favorite ? '♥' : '♡'}</button></div>
        <div className="specs"><span className="spec">{vehicle.year ?? '—'}</span><span className="spec">{number(vehicle.mileage_km)} км</span><span className="spec">{fuel(vehicle.fuel_type)}</span><span className="spec">{gear(vehicle.gearbox)}</span></div>
        <div className="location"><span className="location-dot"></span>{vehicle.current_location_city || 'Локацията не е налична'}{vehicle.current_location_country ? `, ${vehicle.current_location_country}` : ''}</div>
        <div className="price-grid"><div><span className="price-label">Покупна цена</span><span className="price-value">{euro(price)}</span></div><div className="total"><span className="price-label">Крайна цена*</span><span className="price-value">{total === null ? 'Очаква данни' : euro(total)}</span></div></div>
        <Link className="details-btn" href={`/vehicles/${encodeURIComponent(vehicle.id)}`}><span>Виж автомобила</span><span>→</span></Link>
      </div>
    </article>
  );
}
