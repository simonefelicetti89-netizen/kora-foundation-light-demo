from _build import *
NAVG = [("Il mio spazio", [("Percorso","idx","worker.html",None),("Opportunità","bars","#",'4'),("Prenotazioni","clock","#",None)]),
        ("Evidenze", [("Le mie evidenze","doc","#",'2'),("Dynamic Impact CV","user","#",None)]),
        ("Controllo", [("Privacy e condivisione","shield","#",None),("Consensi","lock","#",None)])]
n = nav("Staging", NAVG, "Percorso", "Giulia Ronchi", "My KORA · H1 2026", "GR", "#6E63F8,#3B2FD4",
        "Giulia Ronchi", "Lavoratrice", [("var(--ok)","Evidenze valide","18"),("var(--warn)","Da completare","1")])
t = topbar(["My KORA","Percorso"],
      f'{SEARCH("Cerca attività, evidenze")}{BELL}<button class="btn btn-g">{ico("shield",14,2.2)}Privacy</button>')

def tl(date, title, desc, pil, pilcol, pilbg, pilink, tags, extra=''):
    tg = "".join(f'<span class="chip" style="box-shadow:none;background:var(--l2)">{x}</span>' for x in tags)
    return f'''        <div class="tlr">
          <span class="tld">{date}</span>
          <span class="tlm"><i style="background:{pilcol}"></i></span>
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="h2">{title}</span>
              <span class="st idle" style="background:{pilbg};color:{pilink}"><i style="background:{pilcol}"></i>{pil}</span>
            </div>
            <p class="p" style="margin-top:4px">{desc}</p>
            <div style="display:flex;gap:7px;margin-top:9px;flex-wrap:wrap">{tg}{extra}</div>
          </div>
        </div>'''

body = f'''    <div class="g12">

      <!-- PERSONAL BALANCE — the pillar grammar, in the register that belongs
           to a worker: personal, private, never comparative. -->
      <section class="c8 s1" aria-label="Personal Impact Balance">
        <div class="hd">
          <span class="lbl">Personal Impact Balance · H1 2026</span>
          <div class="hd-r">
            <span class="st idle"><i></i>Solo tu vedi questa pagina</span>
            <div class="seg"><button aria-pressed="true">Semestre</button><button aria-pressed="false">Anno</button></div>
          </div>
        </div>
        <div class="pad">
          <div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap">
            <div>
              <div class="d1" style="font-size:56px">284</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                <span class="delta up">+42</span><span class="sm">Impact Units vs H2 2025</span>
              </div>
            </div>
            <div style="flex:1;min-width:220px">
              <div class="track-bar" style="height:30px" role="img" aria-label="LIFE 96, GROWTH 79, CONNECTION 60, LEGACY 49">
                <div class="track-seg" style="flex:96;background:var(--life)"><b>96</b></div>
                <div class="track-seg" style="flex:79;background:var(--growth)"><b>79</b></div>
                <div class="track-seg" style="flex:60;background:var(--connection)"><b>60</b></div>
                <div class="track-seg" style="flex:49;background:var(--legacy)"><b>49</b></div>
                <div class="track-seg track-gap" style="flex:40"><b style="color:var(--ink-3);text-shadow:none">IMPACT —</b></div>
              </div>
              <div class="track-key" style="margin-top:10px">
                <span class="tk"><i style="background:var(--life)"></i><s>LIFE</s><b>96</b></span>
                <span class="tk"><i style="background:var(--growth)"></i><s>GROWTH</s><b>79</b></span>
                <span class="tk"><i style="background:var(--connection)"></i><s>CONNECTION</s><b>60</b></span>
                <span class="tk"><i style="background:var(--legacy)"></i><s>LEGACY</s><b>49</b></span>
                <span class="tk"><i style="background:rgba(6,3,43,.12)"></i><s>IMPACT</s><b>nessuna attività</b></span>
              </div>
            </div>
          </div>
          <div class="s2" style="padding:12px 14px;margin-top:16px;display:flex;gap:10px;align-items:center">
            {ico('info',15,2).replace('currentColor','var(--info)')}
            <span class="sm" style="min-width:0">Il tuo PIB non viene confrontato con altre persone e non è mai visibile
            a ruoli aziendali. Serve solo a te, e ad alimentare l'aggregato d'organizzazione.</span>
          </div>
        </div>
      </section>

      <!-- PRIVACY as a first-class Product object, not a policy link -->
      <section class="c4 s1" aria-label="Confine di visibilità">
        <div class="hd"><span class="lbl">Chi vede cosa</span><div class="hd-r"><span class="st ok"><i></i>Attivo</span></div></div>
        <div class="pad" style="display:grid;gap:14px">
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="width:28px;height:28px;border-radius:8px;background:var(--ok-tint);display:grid;place-items:center;flex:none;color:var(--ok)">{ico('check',15,2.2)}</span>
            <div><span class="h2" style="font-size:13px">La tua azienda vede</span>
            <p class="p" style="margin-top:3px">Solo aggregati d'organizzazione, e solo per gruppi di almeno 10 persone.</p></div>
          </div>
          <div style="height:1px;background:var(--line)"></div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <span style="width:28px;height:28px;border-radius:8px;background:rgba(6,3,43,.06);display:grid;place-items:center;flex:none;color:var(--ink-3)">{ico('lock',15,2)}</span>
            <div><span class="h2" style="font-size:13px">Resta privato</span>
            <p class="p" style="margin-top:3px">PIB, timeline, evidenze, prenotazioni, note e consensi. Per architettura, non per impostazione.</p></div>
          </div>
          <button class="btn btn-g btn-sm" style="justify-content:center">Gestisci condivisione</button>
        </div>
      </section>

      <section class="c8 s1" aria-label="Timeline">
        <div class="hd">
          <span class="lbl">Timeline contributi</span>
          <div class="hd-r">
            <div class="seg"><button aria-pressed="true">Tutti</button><button aria-pressed="false">Con evidenza</button><button aria-pressed="false">Da completare</button></div>
          </div>
        </div>
        <div class="pad" style="padding-top:4px">
{tl("12 giu","Certificazione competenze digitali — livello 2","Completata. Evidenza verificata dal provider LMS.","GROWTH","var(--growth)","rgba(47,125,85,.12)","#2F7D55",["+16,4 IU","Tier 3 · verificata"])}
{tl("03 giu","Percorso prevenzione cardiologica","Partecipazione confermata. Nessun dato clinico è raccolto da KORA.","LIFE","var(--life)","rgba(199,111,61,.12)","#8A4A22",["+18,4 IU","Tier 3 · verificata"])}
{tl("21 mag","Mentoring senior–junior, ciclo trimestrale","In attesa di evidenza. Puoi allegare un documento o chiedere conferma al referente.","LEGACY","var(--legacy)","rgba(138,117,98,.14)","#6B5A49",["7,1 IU stimate"],'<button class="btn btn-primary btn-sm">Allega evidenza</button>')}
{tl("08 mag","Community di pratica cross-funzionale","Partecipazione registrata dal sistema HR.","CONNECTION","var(--connection)","rgba(217,151,103,.16)","#8A4A22",["+11,9 IU","Tier 2 · documentale"])}
        </div>
      </section>

      <div class="c4" style="display:grid;gap:var(--gap);align-content:start">
        <section class="s1" aria-label="Dynamic Impact CV">
          <div class="hd"><span class="lbl">Dynamic Impact CV</span><div class="hd-r"><span class="st idle"><i></i>volontario</span></div></div>
          <div class="pad">
            <p class="p">Genera un link di sola lettura del tuo percorso, valido 7 giorni. Non indicizzato dai motori di ricerca, revocabile in qualsiasi momento.</p>
            <div style="display:flex;gap:8px;margin-top:14px">
              <button class="btn btn-primary" style="flex:1;justify-content:center">Genera link</button>
              <button class="btn btn-g">Anteprima</button>
            </div>
          </div>
        </section>
        <section class="s1" aria-label="Opportunità">
          <div class="hd"><span class="lbl">Opportunità aperte</span><div class="hd-r"><span class="xs">4</span></div></div>
          <div class="pad" style="display:grid;gap:10px">
            <div class="s2" style="padding:11px 12px;display:flex;align-items:center;gap:10px">
              <span class="st idle" style="background:rgba(217,154,43,.15);color:#8A5A00"><i style="background:var(--impact)"></i>IMPACT</span>
              <span class="h2" style="font-size:12.5px;min-width:0">Giornata volontariato — parco fluviale</span>
              <button class="btn btn-g btn-sm" style="margin-left:auto;flex:none">Apri</button>
            </div>
            <div class="s2" style="padding:11px 12px;display:flex;align-items:center;gap:10px">
              <span class="st idle" style="background:rgba(47,125,85,.12);color:#2F7D55"><i style="background:var(--growth)"></i>GROWTH</span>
              <span class="h2" style="font-size:12.5px;min-width:0">Percorso leadership inclusiva</span>
              <button class="btn btn-g btn-sm" style="margin-left:auto;flex:none">Apri</button>
            </div>
          </div>
        </section>
      </div>
    </div>'''

css = '''<style>
  .tlr { display:grid; grid-template-columns:62px 16px minmax(0,1fr); gap:14px; padding:14px 0; align-items:start; }
  .tlr + .tlr { border-top:1px solid var(--line); }
  .tld { font-size:11.5px; font-weight:700; color:var(--ink-3); padding-top:2px; font-variant-numeric:tabular-nums; }
  .tlm { display:grid; place-items:center; padding-top:5px; }
  .tlm i { width:9px; height:9px; border-radius:99px; display:block; }
  @media (max-width:720px){ .tlr { grid-template-columns:52px 12px minmax(0,1fr); gap:10px; } }
</style>
'''
open('worker.html','w').write(page("KORA — My KORA · SIGNAL", n, t, body,
    "WP124 · SIGNAL · Worker / My KORA", css))
print("worker.html")
