'use client';
// components/commons/AdminCommonsModerationPanel.tsx
// B128: Client panel for KORA_ADMIN commons moderation.
// Actions: publish, reject, archive. No individual worker data.

import { useState } from 'react';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const CATEGORY_LABELS: Record<string, string> = {
  announcement:      'Annuncio',
  initiative_update: 'Aggiornamento iniziativa',
  opportunity:       'Opportunità',
  event:             'Evento',
  request:           'Richiesta',
  resource:          'Risorsa',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: 'Bozza',        color: 'rgba(6,3,43,0.50)', bg: 'rgba(6,3,43,0.06)'      },
  pending_review: { label: 'In revisione', color: '#8A5A00',           bg: 'rgba(192,125,42,0.10)'   },
  published:      { label: 'Pubblicato',   color: '#2F7D55',           bg: 'rgba(47,125,85,0.08)'    },
  archived:       { label: 'Archiviato',   color: 'rgba(6,3,43,0.40)', bg: 'rgba(6,3,43,0.04)'      },
  rejected:       { label: 'Rifiutato',    color: '#9E3B2F',           bg: 'rgba(158,59,47,0.08)'    },
};

type FilterStatus = 'all' | 'pending_review' | 'published' | 'draft' | 'rejected' | 'archived';

interface Post {
  id:          string;
  tenant_id:   string;
  author_role: string;
  title:       string;
  body:        string;
  category:    string;
  status:      string;
  pillar:      string | null;
  published_at: string | null;
  reviewed_at:  string | null;
  created_at:   string;
}

interface Props {
  posts:     Post[];
  tenantMap: Record<string, string>;
}

export function AdminCommonsModerationPanel({ posts: initialPosts, tenantMap }: Props) {
  const [posts, setPosts]         = useState<Post[]>(initialPosts);
  const [filter, setFilter]       = useState<FilterStatus>('pending_review');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string>('');

  const tenantIds = Array.from(new Set(initialPosts.map((p) => p.tenant_id)));

  const visible = posts.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (tenantFilter && p.tenant_id !== tenantFilter) return false;
    return true;
  });

  async function doAction(postId: string, newStatus: string) {
    setActionLoading(postId);
    setActionError('');
    try {
      const res  = await fetch(`/api/commons/posts/${postId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json() as { ok: boolean; error?: string; post?: Post };
      if (!res.ok || !data.ok) {
        setActionError(data.error ?? 'Errore sconosciuto.');
      } else {
        setPosts((prev) =>
          prev.map((p) => p.id === postId ? { ...p, status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : p.published_at } : p)
        );
      }
    } catch {
      setActionError('Errore di rete. Riprova.');
    } finally {
      setActionLoading(null);
    }
  }

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'pending_review', label: 'In revisione'  },
    { value: 'published',      label: 'Pubblicati'    },
    { value: 'draft',          label: 'Bozze'         },
    { value: 'rejected',       label: 'Rifiutati'     },
    { value: 'archived',       label: 'Archiviati'    },
    { value: 'all',            label: 'Tutti'         },
  ];

  return (
    <div data-testid="admin-commons-moderation-panel">
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {filterOptions.map(({ value, label }) => (
            <button
              key={value}
              data-testid={`filter-${value}`}
              onClick={() => setFilter(value)}
              style={{
                padding:      '6px 12px',
                borderRadius: 8,
                border:       '1px solid rgba(6,3,43,0.12)',
                background:   filter === value ? '#06032B' : 'transparent',
                color:        filter === value ? '#FFFFFF' : 'rgba(6,3,43,0.60)',
                fontSize:     12,
                fontWeight:   filter === value ? 700 : 500,
                fontFamily:   FONT,
                cursor:       'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tenantIds.length > 1 && (
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            style={{
              padding:      '6px 10px',
              borderRadius: 8,
              border:       '1px solid rgba(6,3,43,0.12)',
              fontSize:     12,
              fontFamily:   FONT,
              color:        'rgba(6,3,43,0.70)',
              background:   '#FFFFFF',
            }}
          >
            <option value="">Tutti i tenant</option>
            {tenantIds.map((tid) => (
              <option key={tid} value={tid}>{tenantMap[tid] ?? tid.slice(0, 8)}</option>
            ))}
          </select>
        )}

        <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', marginLeft: 'auto', fontFamily: FONT }}>
          {visible.length} risultati
        </span>
      </div>

      {actionError && (
        <p style={{ fontSize: 12, color: '#9E3B2F', marginBottom: 12, fontFamily: FONT }}>
          Errore: {actionError}
        </p>
      )}

      {/* Posts */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', background: 'rgba(6,3,43,0.03)', borderRadius: 12, border: '1px dashed rgba(6,3,43,0.10)' }}>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.40)', margin: 0, fontFamily: FONT }}>
            Nessun contenuto in questa categoria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map((post) => {
            const sm       = STATUS_META[post.status] ?? STATUS_META.draft;
            const isLoading = actionLoading === post.id;
            const tenantLabel = tenantMap[post.tenant_id] ?? post.tenant_id.slice(0, 8);

            return (
              <div
                key={post.id}
                data-testid="admin-commons-post-card"
                style={{
                  background:   '#FFFFFF',
                  border:       post.status === 'pending_review' ? '1.5px solid rgba(192,125,42,0.35)' : '1px solid rgba(6,3,43,0.09)',
                  borderRadius: 12,
                  padding:      '16px 20px',
                  opacity:      isLoading ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sm.bg, color: sm.color }}>
                    {sm.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', padding: '2px 6px', background: 'rgba(6,3,43,0.05)', borderRadius: 4 }}>
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </span>
                  {post.pillar && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#C07D2A', padding: '2px 6px', borderRadius: 4, background: 'rgba(192,125,42,0.08)' }}>
                      {post.pillar}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {tenantLabel}
                  </span>
                </div>

                <p style={{ fontSize: 14, fontWeight: 700, color: '#06032B', margin: '0 0 6px', lineHeight: 1.3, fontFamily: FONT }}>
                  {post.title}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: '0 0 12px', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: FONT }}>
                  {post.body}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: '0 0 12px', fontFamily: FONT }}>
                  {post.author_role} · {new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                {/* Moderation actions */}
                {post.status === 'pending_review' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      data-testid={`admin-publish-${post.id}`}
                      disabled={isLoading}
                      onClick={() => doAction(post.id, 'published')}
                      style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#2F7D55', color: '#FFFFFF', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      ✓ Pubblica
                    </button>
                    <button
                      data-testid={`admin-reject-${post.id}`}
                      disabled={isLoading}
                      onClick={() => doAction(post.id, 'rejected')}
                      style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid rgba(158,59,47,0.25)', background: 'rgba(158,59,47,0.06)', color: '#9E3B2F', fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      ✕ Rifiuta
                    </button>
                  </div>
                )}
                {post.status === 'published' && (
                  <button
                    data-testid={`admin-archive-${post.id}`}
                    disabled={isLoading}
                    onClick={() => doAction(post.id, 'archived')}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(6,3,43,0.12)', background: 'transparent', color: 'rgba(6,3,43,0.50)', fontSize: 11, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    Archivia
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
