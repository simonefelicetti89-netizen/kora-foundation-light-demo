from _build import *
rows = [("01","Company Intelligence","company.html","Index composition, movement, five-pillar balance, qualification path, 10-component console","Company"),
        ("02","Dense Operations","operations.html","Queue tabs, filters, bulk actions, 17-row table, IU trace, contextual drawer","Company"),
        ("03","My KORA","worker.html","Personal Impact Balance, privacy boundary, timeline, Dynamic Impact CV","Worker"),
        ("04","Control plane","admin.html","Cross-tenant table, pipeline runs, governance events, safeguard rollup","Admin"),
        ("05","Partner","partner.html","Services delivered, aggregate participation with N&lt;10 suppression, evidence tier","Partner"),
        ("06","Advisor","advisor.html","Review queue, IU trace, evidence assessment, structured outcome","Advisor"),
        ("07","Stati e form","system.html","Empty, loading, error, success, warning, pending, disabled, selected, hover, focus","Sistema")]
ex = ""
for n_, t_, h, d, env in rows:
    ex += f'''          <a class="exr" href="{h}">
            <span class="exn">{n_}</span>
            <span style="min-width:0"><span class="h2" style="display:block">{t_}</span>
              <span class="sm" style="display:block;margin-top:2px">{d}</span></span>
            <span class="st idle" style="flex:none">{env}</span>
            <span class="ib" style="flex:none">{ico('chev',14,2.4)}</span>
          </a>\n'''
body = f'''    <div class="g12">
      <section class="c12 s1">
        <div class="pad-l">
          <div style="display:flex;align-items:center;gap:12px">
            <span class="nav-mark" style="background:linear-gradient(145deg,#6E63F8,#3B2FD4);width:34px;height:34px">{MARK}</span>
            <div><span class="lbl" style="display:block">KORA-WP-124 · Product Experience North Star</span>
            <h1 class="d2" style="margin-top:4px">SIGNAL — inventario esemplari</h1></div>
            <span class="st ok" style="margin-left:auto">{ico('check',13,2.4)}Founder Visual Acceptance · 2026-09-20</span>
          </div>
          <p class="p" style="max-width:76ch;margin-top:14px">
            Direzione approvata. Un solo sistema visivo su sei ambienti. Artefatti isolati, dati sintetici,
            nessuna route di Prodotto, nessuna API, nessun database. Verificati a 1440 · 768 · 375 senza overflow orizzontale.
          </p>
        </div>
      </section>
      <section class="c12 s1">
        <div class="hd"><span class="lbl">Esemplari</span><div class="hd-r"><span class="xs">7 superfici · 6 ambienti</span></div></div>
        <div class="pad" style="padding:6px 14px 14px">
{ex}        </div>
      </section>
      <section class="c12 s1">
        <div class="hd"><span class="lbl">Le tre grammatiche proprietarie</span></div>
        <div class="pad">
          <dl>
            <div class="spec"><dt>A · Composizione</dt><dd class="sm">L'indice è assemblato: contributo ponderato per macroblocco, peso non disponibile, tetto. Ricorre su Company e nella console.</dd></div>
            <div class="spec"><dt>B · Qualificazione</dt><dd class="sm">Evidenza → Confidence → Safeguard → Calibrazione come percorso, e la traccia IU a sei fattori. Ricorre su Company, Operations, Advisor, Partner, Admin.</dd></div>
            <div class="spec"><dt>C · Equilibrio</dt><dd class="sm">Cinque pillar come un sistema attorno al riferimento del 20%, scostamenti a somma zero. Ricorre su Company e, in registro personale, su My KORA.</dd></div>
          </dl>
          <div class="notice info" style="margin-top:14px">{ico('info',16,2)}<span>
            Ogni superficie usa la grammatica che appartiene al suo significato di Prodotto. Operations non contiene
            la composizione dell'indice, e non deve contenerla: l'identità KORA è sistemica, non ripetizione di ogni oggetto ovunque.</span></div>
        </div>
      </section>
    </div>'''
css = '''<style>
  .exr { display:flex; align-items:center; gap:16px; padding:14px 0; }
  .exr + .exr { border-top:1px solid var(--line); }
  .exr:hover .h2 { color:var(--violet-700); }
  .exn { font-size:11px; font-weight:800; color:var(--ink-mute); letter-spacing:.06em; flex:none; width:22px; }
</style>
'''
NG = [("Esemplari", [("Indice","grid","index.html",None),("Company","idx","company.html",None),
      ("Operations","rows","operations.html",None),("My KORA","user","worker.html",None),
      ("Admin","bldg","admin.html",None),("Partner","shield","partner.html",None),
      ("Advisor","doc","advisor.html",None),("Stati e form","map","system.html",None)])]
n = nav("Staging", NG, "Indice", "KORA Design", "SIGNAL · WP124", "KD", "#6E63F8,#3B2FD4",
        "Design System", "WP124", [("var(--ok)","Contrasto","AA"),("var(--ok)","Overflow","0")])
t = topbar(["WP124","SIGNAL","Inventario"], f'{BELL}')
open('index.html','w').write(page("KORA — WP124 SIGNAL · inventario", n, t, body, "WP124 · SIGNAL · Inventario", css))
print("index.html")
