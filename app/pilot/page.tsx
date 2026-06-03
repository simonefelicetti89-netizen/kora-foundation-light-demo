'use client';

// app/pilot/page.tsx — Foundation Light Pilot: costi, modalità, FAQ, contatto.
// 'use client' per: useState del form + IntersectionObserver reveal.
// Form → mailto: zero backend. prefers-reduced-motion respected.

import { useState } from 'react';
import Link from 'next/link';
import { PACKAGES, PILOT_EMAIL } from '@/lib/landing/packages';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { MarketingNav } from '@/components/landing/MarketingNav';
import { MarketingFooter } from '@/components/landing/MarketingFooter';
import styles from './pilot.module.css';

const PILOT_NAV_LINKS = [
  { label: '← Home',         href: '/'           },
  { label: 'Esplora la demo', href: '/demo-guide' },
];

// ── FAQ item ─────────────────────────────────────────────────────────────────
function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className={`${styles.qa} ${styles.reveal}`}>
      <summary className={styles.qaSummary}>
        {q}
        <em className={styles.qaIco} aria-hidden="true">+</em>
      </summary>
      <div className={styles.qaAnswer}>{a}</div>
    </details>
  );
}

// ── Contact form ──────────────────────────────────────────────────────────────
function ContactForm() {
  const [azienda, setAzienda] = useState('');
  const [nome,    setNome]    = useState('');
  const [email,   setEmail]   = useState('');
  const [ruolo,   setRuolo]   = useState('');
  const [wf,      setWf]      = useState('');
  const [pkg,     setPkg]     = useState('');
  const [msg,     setMsg]     = useState('');
  const [err,     setErr]     = useState(false);

  function handleSend(ev: React.MouseEvent<HTMLAnchorElement>) {
    ev.preventDefault();
    if (!azienda.trim() || !nome.trim() || !email.trim()) {
      setErr(true);
      return;
    }
    setErr(false);
    const subject = `Richiesta pilot Foundation Light — ${azienda}`;
    const body = [
      `Azienda: ${azienda}`,
      `Referente: ${nome}`,
      `Email: ${email}`,
      `Ruolo: ${ruolo || '—'}`,
      `Workforce: ${wf || '—'}`,
      `Pacchetto: ${pkg || 'da definire'}`,
      '',
      'Messaggio:',
      msg || '—',
    ].join('\n');
    window.location.href = `mailto:${PILOT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const inp: React.CSSProperties = {};

  return (
    <div className={`${styles.form} ${styles.reveal} ${styles.d2}`}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-azienda">Azienda *</label>
        <input id="f-azienda" className={styles.fieldInput} type="text" placeholder="Ragione sociale" value={azienda} onChange={(e) => setAzienda(e.target.value)} style={inp} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-nome">Nome e cognome *</label>
        <input id="f-nome" className={styles.fieldInput} type="text" placeholder="Referente" value={nome} onChange={(e) => setNome(e.target.value)} style={inp} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-email">Email *</label>
        <input id="f-email" className={styles.fieldInput} type="email" placeholder="nome@azienda.it" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-ruolo">Ruolo</label>
        <input id="f-ruolo" className={styles.fieldInput} type="text" placeholder="HR / ESG / CFO" value={ruolo} onChange={(e) => setRuolo(e.target.value)} style={inp} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-wf">Workforce</label>
        <select id="f-wf" className={styles.fieldSelect} value={wf} onChange={(e) => setWf(e.target.value)}>
          <option value="">Seleziona…</option>
          <option>{'< 50'}</option>
          <option>50–150</option>
          <option>150–500</option>
          <option>500–1.500</option>
          <option>{'> 1.500'}</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="f-pkg">Pacchetto di interesse</label>
        <select id="f-pkg" className={styles.fieldSelect} value={pkg} onChange={(e) => setPkg(e.target.value)}>
          <option value="">Non so ancora</option>
          <option>Diagnostic</option>
          <option>Pilot (raccomandato)</option>
          <option>Strategic</option>
        </select>
      </div>
      <div className={`${styles.field} ${styles.fieldFull}`}>
        <label className={styles.fieldLabel} htmlFor="f-msg">Messaggio</label>
        <textarea id="f-msg" className={styles.fieldTextarea} placeholder="Contesto, obiettivi, tempistiche…" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      {err && (
        <p className={`${styles.formErr} ${styles.fieldFull}`} role="alert">
          Compila i campi obbligatori (azienda, nome, email).
        </p>
      )}
      <div className={`${styles.formActions} ${styles.fieldFull}`}>
        {/* BOOKING_LINK non fornito: bottone "Prenota una call" rimosso */}
        <a className={styles.btnPrimary} href={`mailto:${PILOT_EMAIL}`} onClick={handleSend}>
          Invia richiesta →
        </a>
      </div>
      <p className={`${styles.formNote} ${styles.fieldFull}`}>
        * Campi obbligatori. Inviando la richiesta accetti di essere ricontattato in merito al pilot. Nessun dato viene memorizzato da questa pagina: il messaggio parte dal tuo client di posta.
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PilotPage() {
  const rootRef = useLandingReveal(styles.reveal, styles.revealIn);

  return (
    <div ref={rootRef} className={styles.root}>

      {/* ── NAV ── */}
      <MarketingNav
        brandHref="/"
        links={PILOT_NAV_LINKS}
        ctaHref="#contatto"
        ctaLabel="Richiedi informazioni"
      />

      {/* ── HERO ── */}
      <header className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true" />
        <div className={`${styles.wrap} ${styles.heroInner}`}>
          <p className={`${styles.eyebrow} ${styles.reveal} ${styles.revealIn}`}>Foundation Light · Pilot</p>
          <h1 className={`${styles.heroTitle} ${styles.reveal} ${styles.revealIn} ${styles.d1}`}>
            Avvia un pilot. <em className={styles.heroTitleEm}>Senza impegni automatici.</em>
          </h1>
          <p className={`${styles.heroPara} ${styles.reveal} ${styles.revealIn} ${styles.d2}`}>
            Un percorso diagnostico guidato per misurare, con i tuoi dati, ciò che la tua spesa in welfare, formazione e persone attiva davvero. Operato dal team KORA, con costi e confini espliciti fin dall&apos;inizio.
          </p>
          <div className={`${styles.heroCta} ${styles.reveal} ${styles.revealIn} ${styles.d3}`}>
            <a className={styles.btnPrimary} href="#contatto">Richiedi informazioni →</a>
            <Link className={styles.btnGhost} href="/demo-guide">Prima esplora la demo</Link>
          </div>
          <div className={`${styles.heroMeta} ${styles.reveal} ${styles.revealIn} ${styles.d4}`}>
            {[
              ['4–10', 'settimane'],
              ['Service-assisted', 'operato da KORA'],
              ['Excel / CSV', 'nessuna integrazione'],
              ['Org-level', 'nessun dato individuale'],
            ].map(([v, l]) => (
              <div key={l} className={styles.metaItem}>
                <span className={styles.metaVal}>{v}</span>
                <span className={styles.metaLabel}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── MODALITÀ ── */}
      <section className={`${styles.block} ${styles.secCanvas}`} id="modalita">
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Come funziona il pilot</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>Tu invii i file. KORA opera tutta la pipeline.</h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            Il modello è <strong>service-assisted</strong>: l&apos;azienda non deve imparare uno strumento né integrare sistemi. Invia export standard; il team KORA esegue intake, classificazione, review e scoring, e consegna un Decision Pack di cui rispondere al board.
          </p>
          <div className={styles.steps}>
            {[
              ['01','Kickoff & perimetro','Definiamo insieme scope, periodo di riferimento, sedi o reparti inclusi e obiettivi della lettura.'],
              ['02','Invio dati','Esporti da HR, welfare, LMS e iniziative people in Excel/CSV. Aggregazione con soglia privacy N ≥ 10.'],
              ['03','KORA opera la pipeline','Eligibility Gate, UEF Review, Impact Units, KORA Index, Confidence e Safeguard. Tutto tracciabile.'],
              ['04','Decision Pack','Consegna board-ready in sessione dedicata, con raccomandazioni spiegabili e confini metodologici espliciti.'],
            ].map(([n, t, d], i) => (
              <div key={n} className={`${styles.step} ${styles.reveal} ${i === 0 ? styles.d1 : i === 1 ? styles.d2 : i === 2 ? styles.d3 : styles.d4}`}>
                <span className={styles.stepNum}>{n}</span>
                <span className={styles.stepTitle}>{t}</span>
                <span className={styles.stepDesc}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COSTI ── */}
      <section className={`${styles.block} ${styles.secPaper}`} id="costi">
        <div className={styles.wrap}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Costi · pacchetti Foundation Light</p>
          <h2 className={`${styles.head} ${styles.reveal} ${styles.d1}`}>Tre pacchetti. Prezzi indicativi, trasparenti.</h2>
          <p className={`${styles.lead} ${styles.reveal} ${styles.d2}`}>
            Le cifre sotto sono range indicativi per orientarti. Il preventivo definitivo dipende dal perimetro e dalla qualità dei dati, e viene confermato dopo il kickoff — senza impegno automatico.
          </p>
          {/* Packages from single-source lib/landing/packages.ts */}
          <div className={styles.pkgs}>
            {PACKAGES.map((p, i) => (
              <div
                key={p.id}
                className={`${styles.pkg} ${p.recommended ? styles.pkgHi : ''} ${styles.reveal} ${i === 0 ? styles.d2 : i === 1 ? styles.d3 : styles.d4}`}
              >
                {p.recommended && <span className={styles.pkgTag}>Raccomandato</span>}
                <span className={`${styles.pkgDur} ${p.recommended ? styles.pkgDurHi : ''}`}>{p.duration}</span>
                <span className={styles.pkgTitle}>{p.namePilot}</span>
                <span className={`${styles.pkgPrice}`}>{p.price}</span>
                <ul className={styles.pkgUl}>
                  {p.items.map((t) => (
                    <li key={t} className={styles.pkgLi}><span className={styles.pkgDot}>·</span>{t}</li>
                  ))}
                </ul>
                <div className={styles.pkgDeliv}>Deliverable: {p.deliverable}</div>
              </div>
            ))}
          </div>

          <div className={`${styles.drivers} ${styles.reveal} ${styles.d2}`}>
            <h4 className={styles.driversH4}>Cosa determina il prezzo</h4>
            <ul className={styles.driversUl}>
              {[
                ['Perimetro', '— workforce, sedi e reparti inclusi'],
                ['Qualità dati', '— disponibilità e struttura degli export'],
                ['Profondità', '— ampiezza del Decision Pack'],
                ['Advisor', '— workshop e sessioni C-suite'],
              ].map(([b, rest]) => (
                <li key={b} className={styles.driversLi}><strong>{b}</strong>{rest}</li>
              ))}
            </ul>
          </div>
          <p className={`${styles.priceNote} ${styles.reveal} ${styles.d2}`}>
            I prezzi non includono IVA. Nessun costo è dovuto prima della conferma del perimetro in fase di kickoff. Foundation Light è un percorso diagnostico, non un abbonamento SaaS.
          </p>
        </div>
      </section>

      {/* ── COSA SERVE + FAQ ── */}
      <section className={`${styles.block} ${styles.secCanvas}`}>
        <div className={styles.wrap}>
          <div className={styles.needs}>
            <div className={`${styles.reveal} ${styles.d1}`}>
              <h4 className={styles.needsH4}>Cosa serve da te</h4>
              <ul className={styles.needsUl}>
                {['Export da welfare / flexible benefits','Dati formazione / LMS','Iniziative people, salute, community','Anagrafica aggregata della workforce','Un referente interno (HR / ESG / CFO)'].map((t) => (
                  <li key={t} className={styles.needsLi}><span className={styles.needsCk}>✓</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
            <div className={`${styles.reveal} ${styles.d2}`}>
              <h4 className={styles.needsH4}>Cosa NON serve</h4>
              <ul className={styles.needsUl}>
                {['Nessuna integrazione API o IT','Nessun dato individuale identificabile oltre il minimo','Nessuno strumento da imparare o installare','Nessun impegno pluriennale'].map((t) => (
                  <li key={t} className={styles.needsLi}><span className={styles.needsCk}>✓</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`} style={{ marginTop: '3rem' }}>Domande frequenti</p>
          <div className={styles.faq}>
            <FAQ q="I miei dipendenti vengono profilati o valutati?" a="No. KORA produce esclusivamente un output a livello di organizzazione, aggregato, con soglia privacy N ≥ 10. Nessun ranking, rating o profilo individuale viene prodotto o esposto. Il Personal Impact Balance resta privato al lavoratore." />
            <FAQ q="Servono integrazioni o lavoro del nostro IT?" a="No. Si parte da export standard in Excel/CSV. Non sono richieste API, connettori o installazioni." />
            <FAQ q="È una certificazione ESG?" a="No. KORA supporta la rendicontazione CSR/ESG con evidenze people strutturate e spiegabili, ma non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale o assurance." />
            <FAQ q="I dati del pilot sono reali?" a="Nell'ambiente demo i dati sono sintetici. Nel pilot reale usiamo i tuoi dati, con DPA firmato e governance privacy esplicita prima di qualsiasi caricamento." />
            <FAQ q="Quanto dura e cosa ottengo?" a="Da 4 a 10 settimane secondo il pacchetto. Ottieni un Decision Pack board-ready: KORA Index, Confidence Score, Activation Safeguard, Activation Debt e raccomandazioni spiegabili." />
          </div>
        </div>
      </section>

      {/* ── CONTATTO ── */}
      <section className={`${styles.block} ${styles.contact}`} id="contatto">
        <div className={styles.contactBg} aria-hidden="true" />
        <div className={`${styles.wrap} ${styles.contactInner}`}>
          <p className={`${styles.kicker} ${styles.eyebrow} ${styles.reveal}`}>Richiedi informazioni</p>
          <h2 className={`${styles.head} ${styles.contactHead} ${styles.reveal} ${styles.d1}`}>Parliamo del tuo pilot.</h2>
          <p className={`${styles.lead} ${styles.contactLead} ${styles.reveal} ${styles.d2}`}>
            Compila i campi: il pulsante apre il tuo client di posta con il messaggio già pronto. Ti rispondiamo con un&apos;ipotesi di perimetro e un preventivo indicativo, senza impegno.
          </p>
          <ContactForm />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <MarketingFooter />

    </div>
  );
}
