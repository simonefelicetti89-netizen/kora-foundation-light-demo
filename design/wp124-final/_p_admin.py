from _build import *
NAVG = [("Control plane", [("Aziende","bldg","admin.html",'24'),("Esecuzioni scoring","idx","#",None),("Governance","shield","#",'3')]),
        ("Pipeline", [("Ingestioni","up","#",'7'),("Mappature AI","map","#",'12'),("Code advisor","rows","#",'38')]),
        ("Sistema", [("Metodologia","doc","#",None),("Sorgenti","db","#",None)])]
n = nav("Staging", NAVG, "Aziende", "KORA Operations", "Control plane · 24 tenant", "KO", "#2BB7D9,#1B7F98",
        "Marco Delli", "KORA Admin", [("var(--ok)","Pipeline","ok"),("var(--warn)","Run falliti","1"),("var(--ink-mute)","Coda","38")])
t = topbar(["Admin","Control plane","Aziende"],
      f'{SEARCH("Cerca tenant, run, evento")}<div class="seg"><button aria-pressed="false">H2 25</button><button aria-pressed="true">H1 26</button></div>{BELL}<button class="btn btn-ink">Nuova esecuzione</button>')

def row(code, name, idx, delta, up, cs, sg, sgc, cov, run, st, stc):
    d = f'<span class="delta {"up" if up else "dn"}" style="height:19px;font-size:11px">{delta}</span>'
    return f'''              <tr>
                <td><input type="checkbox" aria-label="Seleziona {name}"></td>
                <td class="b mono">{code}</td>
                <td class="desc">{name}</td>
                <td class="r mono b">{idx}</td>
                <td>{d}</td>
                <td class="r mono">{cs}</td>
                <td><span class="st {sgc}"><i></i>{sg}</span></td>
                <td class="r mono">{cov}</td>
                <td class="m">{run}</td>
                <td><span class="st {stc}"><i></i>{st}</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri {name}">{ico('chev',14,2.4)}</button></div></td>
              </tr>'''

rows = "\n".join([
 row("TN-0041","Acme Manifattura","50,4","+3,0",True,"72","CLEAR","ok","92,5","2h fa","Pubblicato","ok"),
 row("TN-0038","Nordest Servizi","44,1","+1,2",True,"64","CLEAR","ok","100","5h fa","Pubblicato","ok"),
 row("TN-0052","Brianza Componenti","31,8","−2,4",False,"58","WARNING","warn","92,5","1g fa","In revisione","info"),
 row("TN-0019","Litorale Logistica","28,6","+0,4",True,"41","FLAGGED","risk","85,0","1g fa","Bloccato","risk"),
 row("TN-0067","Val Padana Food","47,9","+5,1",True,"69","CLEAR","ok","100","3h fa","Pubblicato","ok"),
 row("TN-0072","Alpe Tessile","—","—",True,"—","—","idle","—","mai","insufficient_data","idle"),
 row("TN-0055","Costa Chimica","52,3","+0,8",True,"77","CLEAR","ok","92,5","6h fa","Pubblicato","ok"),
 row("TN-0061","Delta Meccanica","39,2","−1,1",False,"61","WARNING","warn","100","8h fa","In revisione","info"),
])

body = f'''    <div class="g12">

      <section class="c12 s1" aria-label="Stato del control plane">
        <div class="qchain" style="border-top:0;border-radius:var(--r-panel) var(--r-panel) 0 0">
          <div class="qnode pass">
            <span class="lbl">Tenant attivi</span>
            <div class="qnode-v">24 <span class="xs" style="font-weight:700">di 26</span></div>
            <div class="qnode-m">2 in onboarding · nessun dato reale</div>
          </div>
          <div class="qnode pass">
            <span class="lbl">Indici pubblicati</span>
            <div class="qnode-v">19</div>
            <div class="qnode-m">5 in revisione o insufficient_data</div>
          </div>
          <div class="qnode hold">
            <span class="lbl">Safeguard non CLEAR</span>
            <div class="qnode-v"><span class="st warn" style="height:23px"><i></i>3 WARNING</span> <span class="st risk" style="height:23px"><i></i>1 FLAGGED</span></div>
            <div class="qnode-m">soglie D-21 · AR / MAR</div>
          </div>
          <div class="qnode hold">
            <span class="lbl">Peso non disponibile</span>
            <div class="qnode-v">7,5% <span class="xs" style="font-weight:700">mediano</span></div>
            <div class="qnode-m">EQW insufficient_data su 17 tenant</div>
          </div>
          <div class="qgate"><button class="btn btn-g">{ico('doc',14,2.2)}Registro governance{ico('chev',13,2.4)}</button></div>
        </div>
      </section>

      <section class="c12 s1" aria-label="Aziende" style="overflow:hidden">
        <div class="hd">
          <span class="lbl">Aziende · vista cross-tenant</span>
          <div class="hd-r">
            <button class="chip on">Periodo: H1 26 {ico('chev',11,2.6)}</button>
            <button class="chip">Safeguard {ico('chev',11,2.6)}</button>
            <button class="chip dash">+ Filtro</button>
            <span class="xs">24 tenant</span>
            <button class="btn btn-g btn-sm">Colonne</button>
          </div>
        </div>
        <div class="tw">
          <table class="t">
            <thead><tr>
              <th style="width:28px"><input type="checkbox" aria-label="Seleziona tutto"></th>
              <th style="width:82px">Tenant</th><th class="desc">Azienda</th>
              <th class="r" style="width:58px">Index</th><th style="width:62px">Δ</th>
              <th class="r" style="width:46px">CS</th><th style="width:104px">Safeguard</th>
              <th class="r" style="width:56px">Tetto</th><th style="width:76px">Ultimo run</th>
              <th style="width:126px">Stato</th><th style="width:38px"></th>
            </tr></thead>
            <tbody>
{rows}
            </tbody>
          </table>
        </div>
        <div class="only-narrow">
          <div class="rec"><div class="rec-top"><span class="b mono">TN-0041</span><span class="h2" style="font-size:13px">Acme Manifattura</span><span class="mono b" style="margin-left:auto">50,4</span></div>
            <div class="rec-meta"><span class="rec-kv">CS <b>72</b></span><span class="rec-kv">Tetto <b>92,5</b></span><span class="st ok"><i></i>CLEAR</span></div></div>
          <div class="rec"><div class="rec-top"><span class="b mono">TN-0052</span><span class="h2" style="font-size:13px">Brianza Componenti</span><span class="mono b" style="margin-left:auto">31,8</span></div>
            <div class="rec-meta"><span class="rec-kv">CS <b>58</b></span><span class="rec-kv">Tetto <b>92,5</b></span><span class="st warn"><i></i>WARNING</span></div></div>
          <div class="rec"><div class="rec-top"><span class="b mono">TN-0019</span><span class="h2" style="font-size:13px">Litorale Logistica</span><span class="mono b" style="margin-left:auto">28,6</span></div>
            <div class="rec-meta"><span class="rec-kv">CS <b>41</b></span><span class="st risk"><i></i>FLAGGED</span></div></div>
          <div class="rec"><div class="rec-top"><span class="b mono">TN-0072</span><span class="h2" style="font-size:13px">Alpe Tessile</span><span class="mono m" style="margin-left:auto">—</span></div>
            <div class="rec-meta"><span class="st idle"><i></i>insufficient_data</span></div></div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-top:1px solid var(--line);flex-wrap:wrap">
          <span class="xs">Nessun dato individuale di lavoratore è accessibile da questa vista.</span>
          <div style="margin-left:auto;display:flex;gap:8px"><span class="xs">1–8 di 24</span>
            <button class="btn btn-g btn-sm" disabled>Precedenti</button><button class="btn btn-g btn-sm">Successivi</button></div>
        </div>
      </section>

      <section class="c6 s1" aria-label="Esecuzioni recenti">
        <div class="hd"><span class="lbl">Esecuzioni scoring</span><div class="hd-r"><span class="st ok"><i></i>pipeline ok</span></div></div>
        <div class="pad" style="display:grid;gap:9px">
          <div class="s2" style="padding:11px 12px;display:flex;align-items:center;gap:10px">
            <span class="st ok"><i></i>OK</span><span class="h2" style="font-size:12.5px;min-width:0">Acme Manifattura · H1 26</span>
            <span class="xs" style="margin-left:auto;flex:none">2h fa · 1.284 record</span>
          </div>
          <div class="s2" style="padding:11px 12px;display:flex;align-items:center;gap:10px">
            <span class="st ok"><i></i>OK</span><span class="h2" style="font-size:12.5px;min-width:0">Costa Chimica · H1 26</span>
            <span class="xs" style="margin-left:auto;flex:none">6h fa · 842 record</span>
          </div>
          <div class="s2" style="padding:11px 12px;display:flex;align-items:center;gap:10px">
            <span class="st risk"><i></i>FALLITO</span><span class="h2" style="font-size:12.5px;min-width:0">Alpe Tessile · H1 26</span>
            <span class="xs" style="margin-left:auto;flex:none">ieri · 0 record eleggibili</span>
          </div>
          <div class="notice warn" style="margin-top:4px">
            {ico('warn',16,2)}<span><b>Alpe Tessile:</b> nessun record supera l'eligibility gate. L'indice resta <b>insufficient_data</b> — non viene prodotto un valore parziale.</span>
          </div>
        </div>
      </section>

      <section class="c6 s1" aria-label="Eventi di governance">
        <div class="hd"><span class="lbl">Eventi di governance</span><div class="hd-r"><span class="xs">ultime 24h</span></div></div>
        <div class="pad" style="display:grid;gap:0">
          <div style="display:grid;grid-template-columns:70px 1fr auto;gap:12px;padding:10px 0;align-items:baseline">
            <span class="xs mono">09:14</span><span class="sm">Versione metodologia confermata · v0.1</span><span class="st idle"><i></i>system</span></div>
          <div style="height:1px;background:var(--line)"></div>
          <div style="display:grid;grid-template-columns:70px 1fr auto;gap:12px;padding:10px 0;align-items:baseline">
            <span class="xs mono">08:02</span><span class="sm">Soglia aggregazione verificata · N≥10</span><span class="st ok"><i></i>pass</span></div>
          <div style="height:1px;background:var(--line)"></div>
          <div style="display:grid;grid-template-columns:70px 1fr auto;gap:12px;padding:10px 0;align-items:baseline">
            <span class="xs mono">ieri</span><span class="sm">Advisor assegnato · TN-0052 · 14 eventi</span><span class="st info"><i></i>assign</span></div>
          <div style="height:1px;background:var(--line)"></div>
          <div style="display:grid;grid-template-columns:70px 1fr auto;gap:12px;padding:10px 0;align-items:baseline">
            <span class="xs mono">ieri</span><span class="sm">Safeguard → FLAGGED · TN-0019</span><span class="st risk"><i></i>safeguard</span></div>
        </div>
      </section>
    </div>'''
open('admin.html','w').write(page("KORA — Admin control plane · SIGNAL", n, t, body,
    "WP124 · SIGNAL · Admin / Control plane"))
print("admin.html")
