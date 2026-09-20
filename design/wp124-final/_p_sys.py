from _build import *
NG = [("Sistema", [("Stati e form","grid","system.html",None),("Tipografia","doc","#",None),("Colore","shield","#",None)]),
      ("Esemplari", [("Company","idx","company.html",None),("Operations","rows","operations.html",None),
                     ("Worker","user","worker.html",None),("Admin","bldg","admin.html",None)])]
n = nav("Staging", NG, "Stati e form", "KORA Design", "SIGNAL · sistema", "KD", "#6E63F8,#3B2FD4",
        "Design System", "WP124", [("var(--ok)","Contrasto","AA"),("var(--ink-mute)","Motion","ridotta ok")])
t = topbar(["WP124","SIGNAL","Stati e form"], f'{BELL}<button class="btn btn-g">Esporta token</button>')

body = f'''    <div class="g12">

      <section class="c7 s1" aria-label="Form strutturato">
        <div class="hd"><span class="lbl">Form strutturato · registrazione evidenza</span>
          <div class="hd-r"><span class="st idle"><i></i>bozza</span></div></div>
        <div class="pad">
          <form onsubmit="return false">
            <div class="field">
              <label for="f1">Titolo iniziativa</label>
              <input class="input" id="f1" value="Percorso prevenzione cardiologica">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              <div class="field">
                <label for="f2">Pillar</label>
                <select class="input" id="f2"><option>LIFE</option><option>GROWTH</option><option>CONNECTION</option><option>IMPACT</option><option>LEGACY</option></select>
                <span class="hint">Esattamente un pillar per istanza di evento.</span>
              </div>
              <div class="field">
                <label for="f3">Tier evidenza</label>
                <select class="input" id="f3"><option>Tier 3 · verificata da terza parte</option><option>Tier 2 · documentale</option><option>Tier 1 · autodichiarata</option></select>
                <span class="hint">Determina il fattore EV nella catena IU.</span>
              </div>
            </div>
            <div class="field invalid">
              <label for="f4">Partecipanti confermati</label>
              <input class="input" id="f4" value="6" aria-invalid="true" aria-describedby="f4e">
              <span class="err" id="f4e">{ico('warn',13,2.4)}Sotto la soglia di aggregazione sicura: il conteggio sarà soppresso (N&lt;10).</span>
            </div>
            <div class="field">
              <label for="f5">Documento di evidenza</label>
              <textarea class="input" id="f5" rows="3" placeholder="Riferimento, verificatore, data…"></textarea>
            </div>
            <div class="field">
              <label for="f6">Riferimento Commitment</label>
              <input class="input" id="f6" value="non disponibile" disabled>
              <span class="hint">Disabilitato: nessun Commitment collegato a questo evento osservato.</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
              <button class="btn btn-primary">Salva evidenza</button>
              <button class="btn btn-g">Annulla</button>
              <span class="ok-msg" style="margin-left:4px">{ico('check',14,2.4)}Bozza salvata 12:04</span>
            </div>
          </form>
        </div>
      </section>

      <div class="c5" style="display:grid;gap:var(--gap);align-content:start">
        <section class="s1" aria-label="Stati di sistema">
          <div class="hd"><span class="lbl">Messaggi di sistema</span></div>
          <div class="pad" style="display:grid;gap:10px">
            <div class="notice ok">{ico('check',16,2)}<span><b>Scoring completato.</b> KORA Index 50,4 · tetto 92,5.</span></div>
            <div class="notice info">{ico('lock',16,2)}<span><b>Gruppo sotto soglia.</b> Dato soppresso per privacy (N&lt;10) — mai un conteggio parziale.</span></div>
            <div class="notice warn">{ico('warn',16,2)}<span><b>Activation Safeguard: WARNING.</b> AR 0,31 sotto la soglia CLEAR di 0,40.</span></div>
            <div class="notice risk">{ico('info',16,2)}<span><b>AGF = 0.</b> Evento squalificato: IU = 0, non modificabile in revisione.</span></div>
          </div>
        </section>

        <section class="s1" aria-label="Stati di caricamento e vuoto">
          <div class="hd"><span class="lbl">Caricamento · vuoto</span></div>
          <div class="pad">
            <p class="xs" style="margin-bottom:10px">In caricamento — skeleton, mai spinner a tutta pagina</p>
            <div style="display:grid;gap:8px">
              <div class="skel" style="height:11px;width:36%"></div>
              <div class="skel" style="height:28px;width:58%"></div>
              <div class="skel" style="height:11px;width:82%"></div>
              <div class="skel" style="height:11px;width:54%"></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:12px">
              <svg class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>
              <span class="xs">Ricalcolo scoring in corso</span>
            </div>
            <div style="height:1px;background:var(--line);margin:16px 0"></div>
            <div class="state-box" style="padding:22px 12px">
              <span style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--l2);color:var(--ink-mute);margin-bottom:12px">{ico('rows',20,1.8)}</span>
              <h4>Nessun evento da rivedere</h4>
              <p>Quando una sorgente produce nuovi eventi UEF compariranno qui, ordinati per IU potenziali.</p>
              <button class="btn btn-g btn-sm">Configura sorgente</button>
            </div>
          </div>
        </section>
      </div>

      <section class="c12 s1" aria-label="Controlli e stati interattivi">
        <div class="hd"><span class="lbl">Controlli · riposo, hover, focus, selezionato, disabilitato</span>
          <div class="hd-r"><span class="xs">prova con Tab: anello Violet 2px, offset 2px, su ogni elemento</span></div></div>
        <div class="pad" style="display:grid;gap:18px">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-primary">Azione primaria</button>
            <button class="btn btn-ink">Azione ink</button>
            <button class="btn btn-g">Secondaria</button>
            <button class="btn btn-q">Quiet</button>
            <button class="btn btn-g" disabled>Disabilitata</button>
            <div class="seg"><button aria-pressed="true">Selezionato</button><button aria-pressed="false">Alternativo</button></div>
          </div>
          <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
            <span class="chip">Filtro</span><span class="chip on">Filtro attivo</span><span class="chip dash">+ Aggiungi</span>
            <span class="st ok"><i></i>CLEAR</span><span class="st warn"><i></i>WARNING</span>
            <span class="st risk"><i></i>FLAGGED</span><span class="st info"><i></i>In corso</span>
            <span class="st idle"><i></i>In attesa</span>
            <span class="delta up">+3,0</span><span class="delta dn">−2,3</span>
          </div>
          <dl style="max-width:760px">
            <div class="spec"><dt>Hover riga</dt><dd class="sm">fondo #FAFBFF · azioni contestuali in fade 90 ms</dd></div>
            <div class="spec"><dt>Selezione</dt><dd class="sm">fondo Violet 9% · barra sinistra 3px Violet</dd></div>
            <div class="spec"><dt>Focus</dt><dd class="sm">outline 2px Violet, offset 2px — mai rimosso, identico ovunque</dd></div>
            <div class="spec"><dt>Disabilitato</dt><dd class="sm">opacità .45 · cursor not-allowed · nessuna ombra</dd></div>
            <div class="spec"><dt>Stato semantico</dt><dd class="sm">sempre punto + parola: il colore non è mai l'unico segnale</dd></div>
            <div class="spec"><dt>Motion</dt><dd class="sm">90 / 160 / 280 ms · cubic-bezier(.2,.6,.25,1) · prefers-reduced-motion → 0,01 ms</dd></div>
          </dl>
        </div>
      </section>
    </div>'''
open('system.html','w').write(page("KORA — Stati e form · SIGNAL", n, t, body, "WP124 · SIGNAL · Stati / Form"))
print("system.html")
