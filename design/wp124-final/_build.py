# WP124 exemplar builder — one visual system (SIGNAL R2C), six environments.
# Generates the shared shell so environment differentiation is structural
# (navigation content, workspace identity, density) and never a palette change.
import io, os

MARK = ('<svg class="mark5" width="19" height="19" viewBox="0 0 22 22" aria-hidden="true">'
 '<polygon points="11,3.5 18.13,8.68 15.41,17.07 6.59,17.07 3.87,8.68" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1"/>'
 '<circle cx="11" cy="3.5" r="2.1" fill="#fff"/><circle cx="18.13" cy="8.68" r="1.7" fill="rgba(255,255,255,.80)"/>'
 '<circle cx="15.41" cy="17.07" r="1.7" fill="rgba(255,255,255,.80)"/><circle cx="6.59" cy="17.07" r="1.7" fill="rgba(255,255,255,.80)"/>'
 '<circle cx="3.87" cy="8.68" r="1.7" fill="rgba(255,255,255,.80)"/></svg>')

I = dict(
 idx='<path d="M3 13h4l3 7 4-16 3 9h4"/>', bars='<path d="M4 19V9m5 10V5m5 14v-7m5 7V8"/>',
 clock='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', rows='<path d="M4 7h16M4 12h16M4 17h10"/>',
 up='<path d="M12 4v11m0 0 4-4m-4 4-4-4M4 20h16"/>', map='<path d="M4 6h16M7 11h13M10 16h10"/>',
 doc='<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
 shield='<path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z"/>',
 db='<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>',
 user='<circle cx="12" cy="8" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
 grid='<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
 check='<path d="m4 12 5 5L20 6"/>', chev='<path d="m9 6 6 6-6 6"/>',
 bell='<path d="M18 8a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7M13.7 21a2 2 0 0 1-3.4 0"/>',
 search='<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 lock='<rect x="4" y="10" width="16" height="10" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 bldg='<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1"/>',
 info='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 warn='<path d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A1.8 1.8 0 0 0 4 20.2h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z"/>',
)
def ico(k, sz=16, w=2):
    return (f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{I[k]}</svg>')

def nav(env, groups, current, ws_name, ws_meta, ws_ini, ws_grad, user, role, state_rows):
    g = ''
    for title, items in groups:
        g += f'    <div class="nav-group">\n      <span class="lbl">{title}</span>\n'
        for label, icon, href, count in items:
            cur = ' aria-current="page"' if label == current else ''
            c = f' <span class="nav-count">{count}</span>' if count else ''
            g += f'      <a class="nav-i" href="{href}"{cur}>{ico(icon)}<span>{label}</span>{c}</a>\n'
        g += '    </div>\n'
    st = ''
    for dot, k, v in state_rows:
        glow = ';box-shadow:0 0 7px var(--ok)' if dot == 'var(--ok)' else ''
        st += (f'    <div class="nav-state-r"><span style="width:6px;height:6px;border-radius:99px;'
               f'background:{dot}{glow}"></span><span>{k}</span><span>{v}</span></div>\n')
    return f'''<nav class="nav" aria-label="Navigazione KORA">
  <div class="nav-brand">
    <span class="nav-mark" style="background:linear-gradient(145deg,#6E63F8,#3B2FD4)">{MARK}</span>
    <span class="nav-word">KORA</span>
    <button class="nav-collapse" aria-label="Comprimi navigazione"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>
  </div>
  <div class="ws">
    <button class="ws-btn">
      <span class="ws-avatar" style="background:linear-gradient(145deg,{ws_grad})">{ws_ini}</span>
      <span style="min-width:0;text-align:left">
        <span class="ws-name" style="display:block">{ws_name}</span>
        <span class="ws-meta">{ws_meta}</span>
      </span>
      <svg style="margin-left:auto;opacity:.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m7 9 5 5 5-5"/></svg>
    </button>
  </div>
  <button class="nav-cmd">{ico('search',14,2.2)}<span>Cerca o esegui…</span><kbd>⌘K</kbd></button>
  <div class="nav-scroll">
{g}  </div>
  <div class="nav-state">
{st}  </div>
  <div class="nav-foot">
    <div style="display:flex;align-items:center;gap:7px;padding:0 8px 8px">
      <span class="env-dot"></span>
      <span style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.52)">{env} · dati sintetici</span>
    </div>
    <a class="nav-user" href="#">
      <span class="nav-ua">{"".join(w[0] for w in user.split()[:2]).upper()}</span>
      <span><span class="nav-un" style="display:block">{user}</span><span class="nav-ur">{role}</span></span>
      <svg style="margin-left:auto;opacity:.45" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m7 9 5 5 5-5"/></svg>
    </a>
  </div>
</nav>'''

def topbar(crumbs, right):
    c = ''
    for i, x in enumerate(crumbs):
        if i: c += ico('chev', 13, 2.4)
        c += f'<b>{x}</b>' if i == len(crumbs)-1 else f'<span>{x}</span>'
    return f'''  <header class="topbar">
    <div class="crumbs">{c}</div>
    <div class="topbar-r">{right}</div>
  </header>'''

SEARCH = lambda ph: f'<div class="search">{ico("search",14,2.2)}{ph}<kbd>⌘K</kbd></div>'
BELL = f'<button class="btn btn-g btn-ico" aria-label="Notifiche">{ico("bell",15)}</button>'

def page(title, navhtml, topbarhtml, body, flag, extra_css=''):
    return f'''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="kora-signal.css">
{extra_css}</head>
<body>
<div class="app">
{navhtml}
<div class="work">
{topbarhtml}
  <div class="content">
{body}
  </div>
  <div class="flag">{flag}</div>
</div>
</div>
</body>
</html>
'''
