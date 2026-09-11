'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import type { Vehicle, VehicleImage } from '../../../lib/types';
import { DISPLAYED_COMMISSION_EUR, getImportTotal } from '../../../lib/pricing';

function euro(v: number | null) { return v === null ? '—' : new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v); }
function integer(v: unknown) { return v === null || v === undefined || v === '' ? '—' : new Intl.NumberFormat('bg-BG').format(Number(v)); }
function km(v: number | null) { return v === null ? '—' : `${integer(v)} км`; }
function date(v: unknown) { if (!v) return '—'; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? String(v) : new Intl.DateTimeFormat('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d); }
function fuel(v: string | null) { const m: Record<string,string> = { hybrid:'Хибрид', petrol:'Бензин', diesel:'Дизел', electric:'Електрически', plug_in_hybrid:'Plug-in хибрид' }; return v ? (m[v.toLowerCase()] ?? v) : '—'; }
function gear(v: string | null) { const m: Record<string,string> = { automatic:'Автоматик', manual:'Ръчна' }; return v ? (m[v.toLowerCase()] ?? v) : '—'; }
function titleFor(v: Vehicle) { return v.model || v.main_type || 'Автомобил'; }
function prettyKey(key: string) { return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function prettyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Не';
  if (Array.isArray(value)) return value.map(prettyValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const v = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
      if (v.error) { setError(v.error.message); return; }
      if (!v.data) { setError('Автомобилът не е намерен.'); return; }
      const vehicleData = v.data as Vehicle;
      setVehicle(vehicleData);

      const result = await supabase
        .from('vehicle_images')
        .select('*')
        .eq('vehicle_id', id)
        .eq('is_document', false)
        .order('sort_order', { ascending: true });

      if (result.error) {
        setError(result.error.message);
      } else {
        setImages((result.data as VehicleImage[]) ?? []);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!lightboxOpen || images.length <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveImage((i) => (i - 1 + images.length) % images.length);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveImage((i) => (i + 1) % images.length);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, images.length]);

  const total = vehicle ? getImportTotal(vehicle) : null;
  const price = total === null ? null : total - DISPLAYED_COMMISSION_EUR;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }


  if (error) return <div className="detail-page"><div className="detail-container"><Link className="back" href="/">← Назад към автомобилите</Link><div className="error">{error}</div></div></div>;
  if (!vehicle) return <div className="detail-page"><div className="detail-container"><Link className="back" href="/">← Назад към автомобилите</Link><div className="loading">Зареждаме автомобила…</div></div></div>;

  return (
    <div className="detail-page">
      <main className="detail-container">
        <div className="detail-topbar"><div className="breadcrumbs"><Link href="/">Автомобили</Link><span>/</span><span>{vehicle.make}</span><span>/</span><b>{titleFor(vehicle)}</b></div><div className="detail-back-row"><button type="button" className="back-button" onClick={goBack}>← Назад към автомобилите</button></div></div>
        <section className="detail-heading">
          <div>
            <div className="detail-eyebrow">{vehicle.make} · {vehicle.stock_number}</div>
            <h1>{titleFor(vehicle)}</h1>
            <div className="detail-meta"><span>{vehicle.year ?? '—'}</span><i>•</i><span>{km(vehicle.mileage_km)}</span><i>•</i><span>{fuel(vehicle.fuel_type)}</span><i>•</i><span>{gear(vehicle.gearbox)}</span><i>•</i><span>{vehicle.body_type || '—'}</span></div>
          </div>
          <div className="detail-heading-price"><span>Крайна ориентировъчна цена</span><strong>{total === null ? 'Очаква данни' : euro(total)}</strong></div>
        </section>

        <section className="detail-main-grid">
          <div className="detail-gallery-card">
            <div className="detail-main-image" onClick={() => images.length && setLightboxOpen(true)}>
              {images[activeImage]?.absolute_url ? <img src={images[activeImage].absolute_url} alt={`${vehicle.make} ${titleFor(vehicle)}`} /> : <div className="gallery-empty">Няма налични снимки</div>}
              {images.length > 1 && <>
                <button type="button" className="gallery-arrow gallery-arrow-left" aria-label="Предишна снимка" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + images.length) % images.length); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                <button type="button" className="gallery-arrow gallery-arrow-right" aria-label="Следваща снимка" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % images.length); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </>}
              <span className="gallery-badge">{images.length ? `${activeImage + 1} / ${images.length}` : 'Без снимки'}</span>
              {images.length > 0 && <span className="gallery-click-hint">Клик за голям размер</span>}
            </div>
            {images.length > 1 && <div className="detail-thumbs">{images.map((img, i) => <button key={img.id || img.absolute_url} className={i === activeImage ? 'active' : ''} onClick={() => setActiveImage(i)}><img src={img.absolute_url} alt="" /></button>)}</div>}
          </div>

          <aside className="detail-price-card">
            <div className="price-card-head"><div><span>КРАЙНА ЦЕНА</span><small>Всички разходи са включени във финалната сума</small></div><span className="price-lock">✓</span></div>
            <Money label="Покупна цена" value={euro(price)} />
            <Money label="Наша комисионна" value={`+ ${euro(DISPLAYED_COMMISSION_EUR)}`} accent />
            <div className="price-total"><span>Общо за клиента</span><strong>{total === null ? 'Очаква данни' : euro(total)}</strong></div>
            <p className="price-note">Показаната ни комисионна е фиксирана на €500. Останалите разходи по вноса са включени в показаната покупна цена.</p>
            <button type="button" className="request-large" onClick={() => { window.location.href = 'viber://chat?number=359877747973'; }}>Запитай за автомобила <span>→</span></button>
          </aside>
        </section>

        <section className="quick-specs">
          {[
            ['Двигател', vehicle.engine_ccm ? `${integer(vehicle.engine_ccm)} см³` : '—'],
            ['Мощност', vehicle.power_hp ? `${integer(vehicle.power_hp)} к.с.` : '—'],
            ['Цвят', vehicle.exterior_colour || '—'],
            ['Ключове', vehicle.keys ?? '—'],
            ['Седалки', vehicle.seats ?? '—'],
            ['Локация', vehicle.current_location_city ? `${vehicle.current_location_city}${vehicle.current_location_country ? `, ${vehicle.current_location_country}` : ''}` : '—'],
          ].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
        </section>

        <section className="detail-overview-card">
          <Overview vehicle={vehicle} />
        </section>



        {lightboxOpen && images.length > 0 && (
          <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Галерия на автомобила" onClick={() => setLightboxOpen(false)}>
            <button type="button" className="lightbox-close" aria-label="Затвори" onClick={() => setLightboxOpen(false)}>×</button>
            <button type="button" className="lightbox-arrow lightbox-arrow-left" aria-label="Предишна снимка" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + images.length) % images.length); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            <div className="lightbox-image-wrap" onClick={(e) => e.stopPropagation()}>
              <img src={images[activeImage]?.absolute_url} alt={`${vehicle.make} ${titleFor(vehicle)}`} />
              <div className="lightbox-counter">{activeImage + 1} / {images.length}</div>
            </div>
            <button type="button" className="lightbox-arrow lightbox-arrow-right" aria-label="Следваща снимка" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % images.length); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
        )}

        <div className="detail-disclaimer">Автомобилите и информацията се актуализират автоматично. Данните за цена, транспорт и наличност са ориентировъчни до потвърждение при заявка.</div>
      </main>
    </div>
  );
}

function Money({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`money-row ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>; }
function Overview({ vehicle }: { vehicle: Vehicle }) {
  const rows: Array<[string, unknown]> = [
    ['Марка', vehicle.make], ['Модел', vehicle.model || vehicle.main_type], ['Година', vehicle.year], ['Първа регистрация', date(vehicle.first_registration_date)],
    ['Пробег', km(vehicle.mileage_km)], ['Гориво', fuel(vehicle.fuel_type)], ['Скоростна кутия', gear(vehicle.gearbox)], ['Двигател', vehicle.engine_ccm ? `${integer(vehicle.engine_ccm)} см³` : null],
    ['Мощност', vehicle.power_hp ? `${integer(vehicle.power_hp)} к.с.` : null], ['Купе', vehicle.body_type], ['Цвят', vehicle.exterior_colour], ['Тапицерия', vehicle.upholstery], ['Врати', vehicle.doors], ['Седалки', vehicle.seats],
    ['Ключове', vehicle.keys], ['Собственици', vehicle.owners], ['Държава', vehicle.current_location_country], ['Град', vehicle.current_location_city],
  ];
  return <div className="overview-block"><div className="tab-title"><div><span>Основни характеристики</span><small>Подробности за автомобила</small></div></div><div className="overview-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{value === null || value === undefined || value === '' ? '—' : String(value)}</b></div>)}</div></div>;
}
