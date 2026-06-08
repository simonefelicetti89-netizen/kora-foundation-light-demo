'use client';
// KORA Commons — Pubblica Iniziativa
// PREVIEW — KORA Foundation Light. Nessuna persistenza. Mostra anteprima della card dopo submit.
// Non è un social network. L'iniziativa deve rispondere: "Quale opportunità di attivazione umana esiste?"

import { useState } from 'react';
import Link from 'next/link';
import {
  INITIATIVE_TYPE_LABELS,
  PILLAR_COMMONS_LABELS,
  type InitiativeType,
  type CommonsInitiative,
} from '@/lib/commons/types';

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
const ALL_TYPES = Object.keys(INITIATIVE_TYPE_LABELS) as InitiativeType[];

const PILLAR_ACCENT: Record<string, string> = {
  LIFE:       '#C76F3D',
  GROWTH:     '#2F7D55',
  CONNECTION: '#D99767',
  IMPACT:     '#4A7FE0',
  LEGACY:     '#8A7562',
};
const PILLAR_BG: Record<string, string> = {
  LIFE:       'rgba(199,111,61,0.10)',
  GROWTH:     'rgba(47,125,85,0.10)',
  CONNECTION: 'rgba(217,151,103,0.12)',
  IMPACT:     'rgba(74,127,224,0.10)',
  LEGACY:     'rgba(138,117,98,0.10)',
};

type FormData = {
  title:              string;
  description:        string;
  pillar:             typeof PILLARS[number];
  initiative_type:    InitiativeType;
  owner_organization: string;
  location:           string;
  location_type:      'in-person' | 'remote' | 'hybrid';
  start_date:         string;
  end_date:           string;
  capacity:           string;
};

const EMPTY: FormData = {
  title:              '',
  description:        '',
  pillar:             'IMPACT',
  initiative_type:    'volunteering',
  owner_organization: '',
  location:           '',
  location_type:      'in-person',
  start_date:         '',
  end_date:           '',
  capacity:           '',
};

function PreviewCard({ data }: { data: FormData }) {
  const accent = PILLAR_ACCENT[data.pillar];
  const bg     = PILLAR_BG[data.pillar];
  return (
    <div style={{
      background:   '#FFFFFF',
      borderRadius: 16,
      border:       `1.5px solid ${accent}40`,
      padding:      24,
      boxShadow:    `0 4px 24px ${accent}14`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          display:      'inline-flex',
          borderRadius: 6,
          padding:      '2px 8px',
          fontSize:     11,
          fontWeight:   700,
          background:   bg,
          color:        accent,
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
        }}>
          {data.pillar}
        </span>
        <span style={{
          display:      'inline-flex',
          borderRadius: 6,
          padding:      '2px 8px',
          fontSize:     10,
          fontWeight:   600,
          background:   'rgba(6,3,43,0.05)',
          color:        'rgba(6,3,43,0.50)',
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
        }}>
          {INITIATIVE_TYPE_LABELS[data.initiative_type]}
        </span>
        <span style={{
          display:      'inline-flex',
          borderRadius: 6,
          padding:      '2px 8px',
          fontSize:     10,
          fontWeight:   700,
          background:   'rgba(47,125,85,0.10)',
          color:        '#2F7D55',
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
        }}>
          Aperta
        </span>
      </div>

      <h3 style={{
        fontWeight:  700,
        fontSize:    15,
        color:       '#06032B',
        margin:      '0 0 8px 0',
        fontFamily:  'Plus Jakarta Sans, system-ui, sans-serif',
      }}>
        {data.title || 'Titolo iniziativa'}
      </h3>
      <p style={{
        fontSize:    12.5,
        color:       'rgba(6,3,43,0.55)',
        lineHeight:  1.5,
        margin:      '0 0 12px 0',
        fontFamily:  'Plus Jakarta Sans, system-ui, sans-serif',
      }}>
        {data.description || 'Descrizione dell\'iniziativa...'}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: 12 }}>
        {data.owner_organization && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(6,3,43,0.70)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            {data.owner_organization}
          </span>
        )}
        {data.location && (
          <span style={{ fontSize: 11.5, color: 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            {data.location_type === 'remote' ? 'Remote' : data.location_type === 'hybrid' ? `Hybrid · ${data.location}` : data.location}
          </span>
        )}
        {data.start_date && (
          <span style={{ fontSize: 11.5, color: 'rgba(6,3,43,0.45)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            {new Date(data.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          fontSize:     12,
          fontWeight:   700,
          padding:      '6px 14px',
          borderRadius: 8,
          border:       `1.5px solid ${accent}`,
          color:        accent,
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
        }}>
          Scopri
        </span>
      </div>
    </div>
  );
}

export default function PublishPage() {
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim())              e.title              = 'Il titolo è obbligatorio.';
    if (!form.description.trim())        e.description        = 'La descrizione è obbligatoria.';
    if (!form.owner_organization.trim()) e.owner_organization = 'Il nome dell\'organizzazione è obbligatorio.';
    if (!form.start_date)                e.start_date         = 'La data di inizio è obbligatoria.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (validate()) setSubmitted(true);
  }

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    padding:      '9px 12px',
    borderRadius: 8,
    border:       '1px solid rgba(6,3,43,0.14)',
    background:   '#FAFAFA',
    fontSize:     13,
    color:        '#06032B',
    fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
    boxSizing:    'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display:     'block',
    fontWeight:  600,
    fontSize:    12.5,
    color:       'rgba(6,3,43,0.70)',
    marginBottom: 5,
    fontFamily:  'Plus Jakarta Sans, system-ui, sans-serif',
  };
  const errorStyle: React.CSSProperties = {
    fontSize:   11,
    color:      '#9E3B2F',
    marginTop:  4,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 80px 0', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
        {/* PREVIEW banner */}
        <div style={{
          background:   'rgba(74,127,224,0.08)',
          border:       '1px solid rgba(74,127,224,0.20)',
          borderRadius: 10,
          padding:      '8px 16px',
          marginBottom: 24,
          display:      'flex',
          alignItems:   'center',
          gap:          10,
        }}>
          <span style={{
            fontSize:      9,
            fontWeight:    700,
            padding:       '2px 7px',
            borderRadius:  4,
            background:    'rgba(74,127,224,0.20)',
            color:         'rgba(74,127,224,0.90)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            border:        '1px solid rgba(74,127,224,0.30)',
          }}>
            COMMONS PREVIEW
          </span>
          <span style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)' }}>
            Nessuna persistenza — anteprima simulata
          </span>
        </div>

        <div style={{
          background:   'rgba(47,125,85,0.08)',
          border:       '1px solid rgba(47,125,85,0.20)',
          borderRadius: 12,
          padding:      '16px 20px',
          marginBottom: 28,
          display:      'flex',
          alignItems:   'center',
          gap:          12,
        }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13.5, color: '#2F7D55', margin: 0 }}>
              Anteprima generata — nessuna pubblicazione reale
            </p>
            <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: '3px 0 0 0' }}>
              In Foundation Light le pubblicazioni non vengono salvate. In Pilot+ l'iniziativa verrebbe inviata per review prima della pubblicazione nella rete KORA.
            </p>
          </div>
        </div>

        <h2 style={{ fontWeight: 800, fontSize: 18, color: '#06032B', marginBottom: 16 }}>
          Anteprima iniziativa
        </h2>
        <PreviewCard data={form} />

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => { setForm(EMPTY); setSubmitted(false); }}
            style={{
              fontSize:     13,
              fontWeight:   700,
              padding:      '10px 20px',
              borderRadius: 9,
              border:       '1px solid rgba(6,3,43,0.14)',
              background:   'transparent',
              color:        '#06032B',
              cursor:       'pointer',
              fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            }}
          >
            Nuova iniziativa
          </button>
          <Link href="/commons" style={{
            fontSize:     13,
            fontWeight:   700,
            padding:      '10px 20px',
            borderRadius: 9,
            border:       'none',
            background:   '#06032B',
            color:        '#FFFFFF',
            textDecoration: 'none',
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          }}>
            ← Torna a Commons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 80px 0', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>

      {/* PREVIEW banner */}
      <div style={{
        background:   'rgba(74,127,224,0.08)',
        border:       '1px solid rgba(74,127,224,0.20)',
        borderRadius: 10,
        padding:      '8px 16px',
        marginBottom: 24,
        display:      'flex',
        alignItems:   'center',
        gap:          10,
      }}>
        <span style={{
          fontSize:      9,
          fontWeight:    700,
          padding:       '2px 7px',
          borderRadius:  4,
          background:    'rgba(74,127,224,0.20)',
          color:         'rgba(74,127,224,0.90)',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          border:        '1px solid rgba(74,127,224,0.30)',
        }}>
          COMMONS PREVIEW
        </span>
        <span style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)' }}>
          Foundation Light — nessuna persistenza · La card verrà mostrata in anteprima
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/commons" style={{
          fontSize:     12,
          color:        'rgba(6,3,43,0.45)',
          textDecoration: 'none',
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          marginBottom: 10,
          display:      'block',
        }}>
          ← KORA Commons
        </Link>
        <h1 style={{
          fontWeight:    800,
          fontSize:      28,
          color:         '#06032B',
          letterSpacing: '-0.03em',
          lineHeight:    1.1,
          margin:        0,
        }}>
          Pubblica un&apos;iniziativa
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(6,3,43,0.50)', marginTop: 7, lineHeight: 1.5 }}>
          Ogni iniziativa deve rispondere: <em>&quot;Quale opportunità di attivazione umana esiste?&quot;</em>
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Titolo */}
        <div>
          <label style={labelStyle}>Titolo *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Titolo chiaro e descrittivo dell'opportunità di attivazione"
            style={inputStyle}
            maxLength={120}
          />
          {errors.title && <p style={errorStyle}>{errors.title}</p>}
        </div>

        {/* Descrizione */}
        <div>
          <label style={labelStyle}>Descrizione *</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descrivi l'iniziativa: cosa fanno i partecipanti, quale attivazione umana viene generata, come si verifica la partecipazione."
            rows={5}
            style={{ ...inputStyle, resize: 'vertical' }}
            maxLength={800}
          />
          {errors.description && <p style={errorStyle}>{errors.description}</p>}
        </div>

        {/* Pillar + Tipo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Pillar KORA *</label>
            <select
              value={form.pillar}
              onChange={(e) => set('pillar', e.target.value as typeof PILLARS[number])}
              style={inputStyle}
            >
              {PILLARS.map((p) => (
                <option key={p} value={p}>{PILLAR_COMMONS_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo di iniziativa *</label>
            <select
              value={form.initiative_type}
              onChange={(e) => set('initiative_type', e.target.value as InitiativeType)}
              style={inputStyle}
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{INITIATIVE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Organizzazione */}
        <div>
          <label style={labelStyle}>Organizzazione promotrice *</label>
          <input
            type="text"
            value={form.owner_organization}
            onChange={(e) => set('owner_organization', e.target.value)}
            placeholder="Nome dell'azienda o organizzazione"
            style={inputStyle}
          />
          {errors.owner_organization && <p style={errorStyle}>{errors.owner_organization}</p>}
        </div>

        {/* Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Modalità</label>
            <select
              value={form.location_type}
              onChange={(e) => set('location_type', e.target.value as FormData['location_type'])}
              style={inputStyle}
            >
              <option value="in-person">In presenza</option>
              <option value="remote">Remoto</option>
              <option value="hybrid">Ibrido</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Luogo (se in presenza)</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Città o sede"
              style={inputStyle}
              disabled={form.location_type === 'remote'}
            />
          </div>
        </div>

        {/* Date + Capacity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Data inizio *</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              style={inputStyle}
            />
            {errors.start_date && <p style={errorStyle}>{errors.start_date}</p>}
          </div>
          <div>
            <label style={labelStyle}>Data fine (opzionale)</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Capacità (opzionale)</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="N. max partecipanti"
              min={1}
              max={10000}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Preview live */}
        {(form.title || form.description || form.owner_organization) && (
          <div>
            <p style={{ fontWeight: 600, fontSize: 12, color: 'rgba(6,3,43,0.45)', marginBottom: 10, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
              Anteprima card
            </p>
            <PreviewCard data={form} />
          </div>
        )}

        {/* Submit */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           12,
          paddingTop:    8,
          borderTop:     '1px solid rgba(6,3,43,0.08)',
          flexWrap:      'wrap',
        }}>
          <button
            type="submit"
            style={{
              fontSize:     13,
              fontWeight:   700,
              padding:      '11px 24px',
              borderRadius: 9,
              border:       'none',
              background:   '#06032B',
              color:        '#FFFFFF',
              cursor:       'pointer',
              fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            }}
          >
            Genera anteprima →
          </button>
          <Link href="/commons" style={{
            fontSize:     12.5,
            color:        'rgba(6,3,43,0.45)',
            textDecoration: 'none',
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          }}>
            Annulla
          </Link>
          <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', marginLeft: 'auto' }}>
            PREVIEW — nessuna pubblicazione reale in Foundation Light
          </span>
        </div>
      </form>
    </div>
  );
}
