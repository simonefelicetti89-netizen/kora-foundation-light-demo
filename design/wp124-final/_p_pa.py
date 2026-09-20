from _build import *

# ── PARTNER ────────────────────────────────────────────────────────────────
NG = [("Attività", [("Servizi","grid","partner.html",'6'),("Iniziative collettive","bars","#",'3'),("Calendario","clock","#",None)]),
      ("Evidenze", [("Evidenze inviate","doc","#",'12'),("Richieste aperte","up","#",'2')]),
      ("Rete", [("Aziende collegate","bldg","#",'4')])]
n = nav("Staging", NG, "Servizi", "Centro Salute Nord", "Partner · 4 aziende", "CS", "#2F7D55,#1F5B3C",
        "Elena Bosca", "Partner Manager", [("var(--ok)","Evidenze accettate","10"),("var(--warn)","In attesa","2")])
t = topbar(["Partner","Attività","Servizi"],
      f'{SEARCH("Cerca servizio, azienda")}{BELL}<button class="btn btn-ink">Invia evidenza</button>')

def svc(name, pil, col, bg, ink, comp, part, sup, tier, tc):
    p = '<span class="st idle"><i></i>Soppresso N&lt;10</span>' if sup else f'<span class="mono b">{part}</span>'
    return f'''              <tr>
                <td class="b mono">{name[0]}</td>
                <td class="desc">{name[1]}</td>
                <td><span class="st idle" style="background:{bg};color:{ink}"><i style="background:{col}"></i>{pil}</span></td>
                <td class="m">{comp}</td>
                <td class="r">{p}</td>
                <td><span class="st {tc}"><i></i>{tier}</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri">{ico('chev',14,2.4)}</button></div></td>
              </tr>'''

rows = "\n".join([
 svc(("SRV-201","Screening cardiologico aziendale"),"LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22","Acme Manifattura","34",False,"Tier 3 · verificata","ok"),
 svc(("SRV-204","Sportello supporto psicologico"),"LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22","Acme Manifattura","7",True,"Tier 3 · verificata","ok"),
 svc(("SRV-209","Percorso nutrizione e movimento"),"LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22","Costa Chimica","61",False,"Tier 2 · documentale","info"),
 svc(("SRV-212","Laboratorio benessere posturale"),"LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22","Nordest Servizi","28",False,"Tier 2 · documentale","info"),
 svc(("SRV-218","Giornata volontariato ambientale"),"IMPACT","var(--impact)","rgba(217,154,43,.15)","#8A5A00","Acme Manifattura","46",False,"Tier 3 · verificata","ok"),
 svc(("SRV-223","Community di pratica territoriale"),"CONNECTION","var(--connection)","rgba(217,151,103,.16)","#8A4A22","Val Padana Food","19",False,"Tier 1 · autodich.","warn"),
])

body = f'''    <div class="g12">
      <section class="c12 s1" aria-label="Sintesi partner">
        <div class="qchain" style="border-top:0;border-radius:var(--r-panel) var(--r-panel) 0 0">
          <div class="qnode pass"><span class="lbl">Servizi attivi</span><div class="qnode-v">6</div>
            <div class="qnode-m">su 4 aziende collegate</div></div>
          <div class="qnode pass"><span class="lbl">Partecipazioni aggregate</span><div class="qnode-v">188</div>
            <div class="qnode-m">1 servizio sotto soglia · conteggio soppresso</div></div>
          <div class="qnode pass"><span class="lbl">Qualità evidenza</span>
            <div class="qnode-v"><span class="ticks" aria-hidden="true"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span> 83%</div>
            <div class="qnode-m">Tier 3 su 4 servizi di 6</div></div>
          <div class="qnode hold"><span class="lbl">Richieste aperte</span>
            <div class="qnode-v"><span class="st warn" style="height:23px"><i></i>2 in attesa</span></div>
            <div class="qnode-m">evidenza richiesta dall'azienda</div></div>
          <div class="qgate"><button class="btn btn-g">{ico('doc',14,2.2)}Registro evidenze{ico('chev',13,2.4)}</button></div>
        </div>
      </section>

      <!-- main working column -->
      <div class="c8" style="display:grid;gap:var(--gap);align-content:start">
        <section class="s1" aria-label="Servizi erogati" style="overflow:hidden">
          <div class="hd"><span class="lbl">Servizi erogati · H1 2026</span>
            <div class="hd-r"><button class="chip on">Periodo: H1 26 {ico('chev',11,2.6)}</button>
              <button class="chip">Azienda {ico('chev',11,2.6)}</button><button class="chip dash">+ Filtro</button>
              <span class="xs">6 servizi</span></div>
          </div>
          <div class="tw"><table class="t">
            <thead><tr><th style="width:70px">Cod.</th><th class="desc">Servizio</th>
            <th style="width:118px">Pillar</th><th style="width:116px">Azienda</th>
            <th class="r" style="width:126px">Partecipanti</th><th style="width:124px">Evidenza</th><th style="width:34px"></th></tr></thead>
            <tbody>
{rows}
            </tbody></table></div>
          <div style="padding:11px 14px;border-top:1px solid var(--line)">
            <span class="xs">Il Partner vede solo conteggi aggregati. Nessun identificativo individuale, nessun PIB, nessun dato clinico.</span>
          </div>
        </section>

        <section class="s1" aria-label="Iniziative collettive" style="overflow:hidden">
          <div class="hd"><span class="lbl">Iniziative collettive</span>
            <div class="hd-r"><span class="st idle"><i></i>alimentano KORA Contribution, non l'Index</span>
              <button class="btn btn-g btn-sm">Nuova iniziativa</button></div></div>
          <div class="tw"><table class="t">
            <thead><tr><th style="width:70px">Cod.</th><th class="desc">Iniziativa</th>
            <th style="width:100px">Pillar</th><th style="width:122px">Aziende</th>
            <th class="r" style="width:104px">Adesioni</th><th style="width:124px">Stato</th><th style="width:34px"></th></tr></thead>
            <tbody>
              <tr><td class="b mono">INI-07</td><td class="desc">Settimana della prevenzione — rete territoriale</td>
                <td><span class="st idle" style="background:rgba(199,111,61,.12);color:#8A4A22"><i style="background:var(--life)"></i>LIFE</span></td>
                <td class="m">3 aziende</td><td class="r mono b">124</td>
                <td><span class="st ok"><i></i>In corso</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri">{ico('chev',14,2.4)}</button></div></td></tr>
              <tr><td class="b mono">INI-09</td><td class="desc">Giornata volontariato — parco fluviale</td>
                <td><span class="st idle" style="background:rgba(217,154,43,.15);color:#8A5A00"><i style="background:var(--impact)"></i>IMPACT</span></td>
                <td class="m">2 aziende</td><td class="r mono b">46</td>
                <td><span class="st ok"><i></i>Conclusa</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri">{ico('chev',14,2.4)}</button></div></td></tr>
              <tr><td class="b mono">INI-11</td><td class="desc">Community di pratica territoriale — Q3</td>
                <td><span class="st idle" style="background:rgba(217,151,103,.16);color:#8A4A22"><i style="background:var(--connection)"></i>CONNECTION</span></td>
                <td class="m">4 aziende</td><td class="r mono b">19</td>
                <td><span class="st info"><i></i>In apertura</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri">{ico('chev',14,2.4)}</button></div></td></tr>
            </tbody></table></div>
        </section>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gap)">
          <section class="s1" aria-label="Aziende collegate">
            <div class="hd"><span class="lbl">Aziende collegate</span><div class="hd-r"><span class="xs">4</span></div></div>
            <div class="pad" style="padding:6px 14px 12px">
              <div style="display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
                <span class="ws-avatar" style="width:24px;height:24px;font-size:9.5px;background:linear-gradient(145deg,#C76F3D,#A2552B)">AM</span>
                <span class="h2" style="font-size:12.5px;min-width:0">Acme Manifattura</span><span class="xs">3 servizi</span></div>
              <div style="height:1px;background:var(--line)"></div>
              <div style="display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
                <span class="ws-avatar" style="width:24px;height:24px;font-size:9.5px;background:linear-gradient(145deg,#2F7D55,#1F5B3C)">CC</span>
                <span class="h2" style="font-size:12.5px;min-width:0">Costa Chimica</span><span class="xs">1 servizio</span></div>
              <div style="height:1px;background:var(--line)"></div>
              <div style="display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
                <span class="ws-avatar" style="width:24px;height:24px;font-size:9.5px;background:linear-gradient(145deg,#3B6EBA,#27497C)">NS</span>
                <span class="h2" style="font-size:12.5px;min-width:0">Nordest Servizi</span><span class="xs">1 servizio</span></div>
              <div style="height:1px;background:var(--line)"></div>
              <div style="display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
                <span class="ws-avatar" style="width:24px;height:24px;font-size:9.5px;background:linear-gradient(145deg,#7C3D8F,#54266B)">VP</span>
                <span class="h2" style="font-size:12.5px;min-width:0">Val Padana Food</span><span class="xs">1 servizio</span></div>
            </div>
          </section>
          <section class="s1" aria-label="Prossime attività">
            <div class="hd"><span class="lbl">Prossime attività</span><div class="hd-r"><span class="xs">7 giorni</span></div></div>
            <div class="pad" style="padding:6px 14px 12px">
              <div style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:9px 0;align-items:baseline">
                <span class="xs mono" style="font-weight:800;color:var(--ink-2)">22 giu</span>
                <span class="sm" style="min-width:0">Screening cardiologico — sessione 4 · Acme Manifattura</span></div>
              <div style="height:1px;background:var(--line)"></div>
              <div style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:9px 0;align-items:baseline">
                <span class="xs mono" style="font-weight:800;color:var(--ink-2)">24 giu</span>
                <span class="sm" style="min-width:0">Apertura Community di pratica · Val Padana Food</span></div>
              <div style="height:1px;background:var(--line)"></div>
              <div style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:9px 0;align-items:baseline">
                <span class="xs mono" style="font-weight:800;color:var(--ink-2)">27 giu</span>
                <span class="sm" style="min-width:0">Laboratorio posturale — ciclo estivo · Nordest Servizi</span></div>
            </div>
          </section>
        </div>
      </div>

      <!-- contextual right rail: what this Partner actually has to do -->
      <div class="c4" style="display:grid;gap:var(--gap);align-content:start">
        <section class="s1" aria-label="Richieste di evidenza aperte">
          <div class="hd" style="background:var(--warn-tint)">
            <span class="lbl" style="color:var(--warn-text)">Da evadere · 2</span>
            <div class="hd-r"><span class="xs" style="color:var(--warn-text)">richieste dall'azienda</span></div></div>
          <div class="pad" style="display:grid;gap:10px">
            <div class="s3" style="padding:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span class="mono" style="font-size:11.5px;font-weight:800;color:var(--ink-3)">SRV-223</span>
                <span class="st warn" style="margin-left:auto"><i></i>scade fra 3g</span></div>
              <span class="h2" style="font-size:13px;display:block">Community di pratica territoriale</span>
              <p class="sm" style="margin-top:4px">Val Padana Food chiede evidenza documentale per elevare il tier da 1 a 2.</p>
              <div style="display:flex;gap:7px;margin-top:10px">
                <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center">Allega evidenza</button>
                <button class="btn btn-g btn-sm">Rispondi</button></div>
            </div>
            <div class="s3" style="padding:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span class="mono" style="font-size:11.5px;font-weight:800;color:var(--ink-3)">SRV-212</span>
                <span class="st idle" style="margin-left:auto"><i></i>scade fra 11g</span></div>
              <span class="h2" style="font-size:13px;display:block">Laboratorio benessere posturale</span>
              <p class="sm" style="margin-top:4px">Nordest Servizi chiede l'attestato di erogazione del ciclo di marzo.</p>
              <div style="display:flex;gap:7px;margin-top:10px">
                <button class="btn btn-g btn-sm" style="flex:1;justify-content:center">Allega evidenza</button></div>
            </div>
          </div>
        </section>

        <section class="s1" aria-label="Evidenze inviate di recente">
          <div class="hd"><span class="lbl">Evidenze inviate</span><div class="hd-r"><span class="xs">12 · ultime 4</span></div></div>
          <div class="pad" style="padding:6px 14px 12px">
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm" style="min-width:0">attestato_screening_H1.pdf</span><span class="st ok"><i></i>Accettata</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm" style="min-width:0">registro_presenze_marzo.csv</span><span class="st ok"><i></i>Accettata</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm" style="min-width:0">report_nutrizione_Q1.pdf</span><span class="st info"><i></i>In verifica</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm" style="min-width:0">liberatoria_volontariato.pdf</span><span class="st warn"><i></i>Integrazione</span></div>
          </div>
        </section>
      </div>
    </div>'''
open('partner.html','w').write(page("KORA — Partner · SIGNAL", n, t, body, "WP124 · SIGNAL · Partner"))
print("partner.html")

# ── ADVISOR ────────────────────────────────────────────────────────────────
NG2 = [("Revisione", [("Coda assegnata","rows","advisor.html",'14'),("In attesa evidenza","clock","#",'5'),("Concluse","check","#",None)]),
       ("Strumenti", [("Metodologia","doc","#",None),("Criteri eleggibilità","shield","#",None)])]
n2 = nav("Staging", NG2, "Coda assegnata", "Studio Ferrari & Co.", "Advisor · 3 aziende", "SF", "#7C3D8F,#54266B",
         "Paolo Ferrari", "Advisor", [("var(--warn)","Da valutare","14"),("var(--ok)","Concluse oggi","6")])
t2 = topbar(["Advisor","Revisione","Coda assegnata"],
      f'{SEARCH("Cerca evento, azienda")}{BELL}<button class="btn btn-ink">Concludi revisione</button>')

def trace_svg(nm,cq,ev,cf,agf,tier):
    fs=[nm,1,cq,ev,cf,agf]; xs=[5,20,35,50,65,80]; y=lambda f: round(4+(1-f)*26,1)
    broken = agf==0; pts=[(xs[i],y(fs[i])) for i in range(6 if not broken else 5)]
    poly=" ".join(f"{x},{yy}" for x,yy in pts); tc={3:"#2F7D55",2:"#6156F5",1:"#D99A2B"}[tier]
    d=[]
    for i,(x,yy) in enumerate(pts):
        d.append((f'<circle cx="{x}" cy="{yy}" r="2.6" fill="#fff" stroke="{tc}" stroke-width="1.8"/>' if tier==1
                  else f'<circle cx="{x}" cy="{yy}" r="2.6" fill="{tc}"/>') if i==3 else
                 f'<circle cx="{x}" cy="{yy}" r="2" fill="#6156F5"/>')
    tail='<path d="M76 10 l8 8 M84 10 l-8 8" stroke="#9E3B2F" stroke-width="2" stroke-linecap="round"/>' if broken else ''
    return ('<svg width="88" height="20" viewBox="0 0 88 20" style="flex:none" aria-hidden="true">'
            '<line x1="5" y1="4" x2="80" y2="4" stroke="rgba(6,3,43,.13)" stroke-width="1" stroke-dasharray="2 2"/>'
            f'<polyline points="{poly}" fill="none" stroke="#6156F5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
            + "".join(d)+tail+'</svg>')

def arow(code, desc, comp, pil, col, bg, ink, tr, iu, st, stc, active=False):
    cls = ' class="active"' if active else ''
    return f'''              <tr{cls}>
                <td class="b mono">{code}</td>
                <td class="desc">{desc}</td>
                <td class="m">{comp}</td>
                <td><span class="st idle" style="background:{bg};color:{ink}"><i style="background:{col}"></i>{pil}</span></td>
                <td>{tr}</td>
                <td class="r mono b">{iu}</td>
                <td><span class="st {stc}"><i></i>{st}</span></td>
                <td><div class="acts"><button class="ib" aria-label="Apri">{ico('chev',14,2.4)}</button></div></td>
              </tr>'''

arows = "\n".join([
 arow("UEF-4823","Mentoring senior–junior, ciclo trimestrale","Acme Manifattura","LEGACY","var(--legacy)","rgba(138,117,98,.14)","#6B5A49",trace_svg(0.7, 1, 1, 1, 0.85, 1),"7,1","Da valutare","warn", True),
 arow("UEF-4834","Banca del tempo interna — primo trimestre","Acme Manifattura","CONNECTION","var(--connection)","rgba(217,151,103,.16)","#8A4A22",trace_svg(0.65, 1, 1, 1, 0.9, 1),"6,3","Da valutare","warn"),
 arow("UEF-5102","Progetto rigenerazione urbana","Val Padana Food","IMPACT","var(--impact)","rgba(217,154,43,.15)","#8A5A00",trace_svg(0.95, 1, 1, 1, 1, 2),"19,7","Da valutare","info"),
 arow("UEF-5118","Archivio pratiche di reparto","Costa Chimica","LEGACY","var(--legacy)","rgba(138,117,98,.14)","#6B5A49",trace_svg(0.75, 1, 1, 1, 1, 2),"10,9","Da valutare","info"),
 arow("UEF-5140","Percorso onboarding buddy","Nordest Servizi","CONNECTION","var(--connection)","rgba(217,151,103,.16)","#8A4A22",trace_svg(0.8, 0.9, 1, 1, 1, 1),"9,4","Evidenza debole","warn"),
 arow("UEF-5147","Ciclo formazione sicurezza — turno B","Costa Chimica","GROWTH","var(--growth)","rgba(47,125,85,.12)","#2F7D55",trace_svg(0.9, 1, 1, 1, 1, 2),"14,2","Da valutare","info"),
 arow("UEF-5153","Sportello ascolto — accessi aggregati","Acme Manifattura","LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22",trace_svg(1, 1, 1, 1, 1, 3),"—","Soppresso N<10","idle"),
 arow("UEF-5161","Trasferimento competenze pre-pensionamento","Nordest Servizi","LEGACY","var(--legacy)","rgba(138,117,98,.14)","#6B5A49",trace_svg(0.7, 1, 1, 1, 1, 1),"8,8","Evidenza debole","warn"),
 arow("UEF-5168","Adozione orto urbano di quartiere","Val Padana Food","IMPACT","var(--impact)","rgba(217,154,43,.15)","#8A5A00",trace_svg(0.85, 1, 1, 1, 1, 2),"12,5","Da valutare","info"),
 arow("UEF-5174","Percorso screening metabolico","Acme Manifattura","LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22",trace_svg(1, 1, 1, 1, 1, 3),"15,2","Da valutare","info"),
 arow("UEF-5180","Mentoring inverso digitale","Costa Chimica","CONNECTION","var(--connection)","rgba(217,151,103,.16)","#8A4A22",trace_svg(0.6, 1, 1, 1, 0.85, 1),"5,4","Evidenza debole","warn"),
 arow("UEF-5186","Corso primo soccorso avanzato","Nordest Servizi","GROWTH","var(--growth)","rgba(47,125,85,.12)","#2F7D55",trace_svg(0.95, 1, 1, 1, 0, 2),"0,0","Squalificato","risk"),
 arow("UEF-5191","Archivio fotografico di stabilimento","Val Padana Food","LEGACY","var(--legacy)","rgba(138,117,98,.14)","#6B5A49",trace_svg(0.75, 1, 1, 1, 1, 1),"9,1","Evidenza debole","warn"),
 arow("UEF-5199","Settimana della prevenzione — rete","Acme Manifattura","LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22",trace_svg(1, 1, 1, 1, 1, 3),"21,4","Da valutare","info"),
])

body2 = f'''    <div class="ops">
      <div style="display:grid;gap:var(--gap);align-content:start;min-width:0">
      <section class="s1" aria-label="Coda advisor" style="overflow:hidden">
        <div class="tabs" role="tablist">
          <button class="tab" role="tab" aria-selected="true">Da valutare <b>14</b></button>
          <button class="tab" role="tab" aria-selected="false">In attesa evidenza <b>5</b></button>
          <button class="tab" role="tab" aria-selected="false">Concluse <b>128</b></button>
        </div>
        <div class="toolbar">
          <button class="chip on">Tier evidenza: 1–2 {ico('chev',11,2.6)}</button>
          <button class="chip">Azienda {ico('chev',11,2.6)}</button>
          <button class="chip">Pillar {ico('chev',11,2.6)}</button>
          <button class="chip dash">+ Filtro</button>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
            <span class="xs">14 eventi · 140,9 IU in valutazione · 1 squalificato</span>
            <button class="btn btn-g btn-sm">Colonne</button>
          </div>
        </div>
        <div class="tw"><table class="t">
          <thead><tr><th style="width:80px">Evento</th><th class="desc">Descrizione</th>
          <th style="width:114px">Azienda</th><th style="width:104px">Pillar</th>
          <th style="width:92px">Traccia IU</th><th class="r" style="width:50px">IU</th>
          <th style="width:116px">Stato</th><th style="width:30px"></th></tr></thead>
          <tbody>
{arows}
          </tbody></table></div>
        <div class="only-narrow">
          <div class="rec"><div class="rec-top"><span class="b mono">UEF-4823</span><span class="mono b" style="margin-left:auto">7,1 IU</span></div>
            <div>Mentoring senior–junior, ciclo trimestrale</div>
            <div class="rec-meta">{trace_svg(.70,1,1,1,.85,1)}<span class="st warn"><i></i>Da valutare</span></div></div>
          <div class="rec"><div class="rec-top"><span class="b mono">UEF-4834</span><span class="mono b" style="margin-left:auto">6,3 IU</span></div>
            <div>Banca del tempo interna — primo trimestre</div>
            <div class="rec-meta">{trace_svg(.65,1,1,1,.90,1)}<span class="st warn"><i></i>Da valutare</span></div></div>
        </div>
        <div style="display:flex;align-items:center;gap:20px;padding:12px 14px;border-top:1px solid var(--line);flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <span class="lbl" style="flex:none">Traccia IU</span>
            <span style="display:flex;align-items:center;gap:7px">{trace_svg(1,1,1,1,1,3)}<span class="xs">piena</span></span>
            <span style="display:flex;align-items:center;gap:7px">{trace_svg(.70,1,1,1,.85,1)}<span class="xs">degrado</span></span>
            <span style="display:flex;align-items:center;gap:7px">{trace_svg(.95,1,1,1,0,2)}<span class="xs">AGF 0</span></span>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:10px"><span class="xs">14 di 14 · coda completa</span>
            <button class="btn btn-g btn-sm" disabled>Precedenti</button><button class="btn btn-g btn-sm">Successivi</button></div>
        </div>
      </section>

      <section class="s1" aria-label="Concluse oggi" style="overflow:hidden">
        <div class="hd"><span class="lbl">Concluse oggi · 6</span>
          <div class="hd-r"><span class="st ok"><i></i>registrate nel Trust Ledger</span>
            <button class="btn btn-g btn-sm">Esporta registro</button></div></div>
        <div class="tw"><table class="t">
          <thead><tr><th style="width:86px">Evento</th><th class="desc">Descrizione</th>
          <th style="width:136px">Azienda</th><th style="width:150px">Esito</th>
          <th class="r" style="width:54px">IU</th><th style="width:74px">Ora</th></tr></thead>
          <tbody>
            <tr><td class="b mono">UEF-5090</td><td class="desc">Percorso nutrizione e movimento</td><td class="m">Costa Chimica</td>
              <td><span class="st ok"><i></i>Confermato</span></td><td class="r mono b">13,4</td><td class="m mono">11:42</td></tr>
            <tr><td class="b mono">UEF-5087</td><td class="desc">Giornata volontariato ambientale</td><td class="m">Acme Manifattura</td>
              <td><span class="st ok"><i></i>Confermato</span></td><td class="r mono b">22,0</td><td class="m mono">11:05</td></tr>
            <tr><td class="b mono">UEF-5081</td><td class="desc">Banca ore solidali — pilota</td><td class="m">Nordest Servizi</td>
              <td><span class="st warn"><i></i>Evidenza richiesta</span></td><td class="r mono m">—</td><td class="m mono">10:28</td></tr>
            <tr><td class="b mono">UEF-5076</td><td class="desc">Laboratorio benessere posturale</td><td class="m">Nordest Servizi</td>
              <td><span class="st ok"><i></i>Confermato</span></td><td class="r mono b">12,8</td><td class="m mono">09:54</td></tr>
            <tr><td class="b mono">UEF-5070</td><td class="desc">Corso aggiornamento normativo</td><td class="m">Val Padana Food</td>
              <td><span class="st risk"><i></i>Non eleggibile</span></td><td class="r mono b">0,0</td><td class="m mono">09:31</td></tr>
            <tr><td class="b mono">UEF-5064</td><td class="desc">Community di pratica cross-funzionale</td><td class="m">Acme Manifattura</td>
              <td><span class="st ok"><i></i>Confermato</span></td><td class="r mono b">11,9</td><td class="m mono">09:02</td></tr>
          </tbody></table></div>
      </section>
      </div>

      <aside class="drawer" aria-label="Valutazione advisor">
        <div class="s1" style="overflow:hidden">
          <div class="hd" style="background:var(--l2)"><span class="lbl">Valutazione</span>
            <div class="hd-r"><button class="ib" aria-label="Precedente"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button>
            <button class="ib" aria-label="Successivo">{ico('chev',14,2.4)}</button></div></div>
          <div class="pad">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="mono" style="font-size:12px;font-weight:800;color:var(--ink-3)">UEF-4823</span>
              <span class="st idle" style="background:rgba(138,117,98,.14);color:#6B5A49"><i style="background:var(--legacy)"></i>LEGACY</span>
              <span class="st warn" style="margin-left:auto"><i></i>Da valutare</span>
            </div>
            <h2 class="d3" style="line-height:1.25">Mentoring senior–junior, ciclo trimestrale</h2>
            <p class="p" style="margin-top:8px">Acme Manifattura · H1 2026 · dichiarato dal referente di reparto,
            senza documento allegato.</p>

            <div class="s2" style="padding:13px 14px;margin-top:14px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <span class="lbl">Catena di calcolo IU</span>{trace_svg(.70,1,1,1,.85,1)}
              </div>
              <div class="trace">
                <div class="trace-r"><span class="k">NM</span><span class="sm">Normalized Magnitude</span><span class="v mono" style="color:var(--warn-text)">0,70</span></div>
                <div class="trace-r"><span class="k">BC</span><span class="sm">Base Contribution · LEGACY</span><span class="v mono">12,0</span></div>
                <div class="trace-r"><span class="k">CQ</span><span class="sm">Correction · qualità</span><span class="v mono">1,00</span></div>
                <div class="trace-r"><span class="k">EV</span><span class="sm">Evidence · autodichiarata</span><span class="v mono" style="color:var(--warn-text)">Tier 1</span></div>
                <div class="trace-r"><span class="k">CF</span><span class="sm">Correction factor</span><span class="v mono">1,00</span></div>
                <div class="trace-r"><span class="k" style="color:var(--violet-700)">AGF</span><span class="sm">Anti-Gaming Factor</span><span class="v mono" style="color:var(--warn-text)">0,85</span></div>
              </div>
              <div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:11px;padding-top:11px;border-top:1px solid var(--l2-edge)">
                <span class="lbl">Impact Units</span><span class="d2" style="font-size:26px">7,1</span>
              </div>
            </div>

            <span class="lbl" style="display:block;margin:16px 0 8px">Esito advisor</span>
            <div style="display:grid;gap:8px">
              <label class="s3" style="padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="radio" name="esito" checked><span class="h2" style="font-size:12.5px">Confermo la classificazione</span></label>
              <label class="s3" style="padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="radio" name="esito"><span class="h2" style="font-size:12.5px">Richiedo evidenza documentale</span></label>
              <label class="s3" style="padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer">
                <input type="radio" name="esito"><span class="h2" style="font-size:12.5px">Non eleggibile</span></label>
            </div>

            <div class="field" style="margin-top:14px">
              <label for="nota">Nota di valutazione</label>
              <textarea class="input" id="nota" rows="3" placeholder="Motivazione sintetica, riferimenti…"></textarea>
              <span class="hint">La nota entra nel Trust Ledger ed è visibile all'azienda in forma aggregata.</span>
            </div>

            <div style="display:flex;gap:8px;margin-top:14px">
              <button class="btn btn-primary" style="flex:1;justify-content:center">{ico('check',14,2.4)}Registra esito</button>
              <button class="btn btn-g">Rinvia</button>
            </div>
          </div>
        </div>

        <div class="s1" style="margin-top:var(--gap)">
          <div class="hd"><span class="lbl">Criteri di eleggibilità</span><div class="hd-r"><span class="xs">v0.1</span></div></div>
          <div class="pad" style="display:grid;gap:0">
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm">Evidenza documentale o di terza parte</span><span class="st ok"><i></i>Tier 2+</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm">Classificazione in un solo pillar</span><span class="st ok"><i></i>obbligatoria</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm">Coorte ≥ 10 per il conteggio</span><span class="st idle"><i></i>altrimenti soppresso</span></div>
            <div style="height:1px;background:var(--line)"></div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 0;align-items:center">
              <span class="sm">AGF = 0 non è revisionabile</span><span class="st risk"><i></i>squalifica</span></div>
          </div>
        </div>

        <div class="s1" style="margin-top:var(--gap)">
          <div class="hd"><span class="lbl">Scorciatoie</span></div>
          <div class="pad" style="display:grid;gap:9px">
            <div style="display:flex;align-items:center;gap:10px"><kbd style="font:inherit;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px;background:var(--l0);border:1px solid var(--line-2)">J / K</kbd><span class="sm">Evento precedente / successivo</span></div>
            <div style="display:flex;align-items:center;gap:10px"><kbd style="font:inherit;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px;background:var(--l0);border:1px solid var(--line-2)">C</kbd><span class="sm">Conferma classificazione</span></div>
            <div style="display:flex;align-items:center;gap:10px"><kbd style="font:inherit;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px;background:var(--l0);border:1px solid var(--line-2)">E</kbd><span class="sm">Richiedi evidenza documentale</span></div>
            <div style="display:flex;align-items:center;gap:10px"><kbd style="font:inherit;font-size:11px;font-weight:800;padding:2px 7px;border-radius:5px;background:var(--l0);border:1px solid var(--line-2)">⌘K</kbd><span class="sm">Comando rapido</span></div>
          </div>
        </div>
      </aside>
    </div>'''

css2 = '''<style>
  .ops { display:grid; grid-template-columns:minmax(0,1fr) 336px; gap:var(--gap); align-items:start; }
  .tabs { display:flex; gap:2px; border-bottom:1px solid var(--line); padding:0 4px; }
  .tab { display:flex; align-items:center; gap:7px; height:38px; padding:0 13px; position:relative;
         font-size:13px; font-weight:700; color:var(--ink-3); border-radius:8px 8px 0 0; }
  .tab:hover { color:var(--ink); background:rgba(6,3,43,.035); }
  .tab[aria-selected='true'] { color:var(--ink); }
  .tab[aria-selected='true']::after { content:''; position:absolute; left:10px; right:10px; bottom:-1px;
         height:2px; border-radius:2px; background:var(--violet); }
  .tab b { font-size:11px; font-weight:800; padding:1px 6px; border-radius:99px; background:rgba(6,3,43,.07); color:var(--ink-2); }
  .tab[aria-selected='true'] b { background:var(--violet-tint); color:var(--violet-700); }
  .toolbar { display:flex; align-items:center; gap:8px; padding:11px 14px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  @media (max-width:1200px){ .ops { grid-template-columns:minmax(0,1fr); } }
</style>
'''
open('advisor.html','w').write(page("KORA — Advisor · SIGNAL", n2, t2, body2, "WP124 · SIGNAL · Advisor", css2))
print("advisor.html")
