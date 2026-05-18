import { useState } from "react";

/* ───────────── PALETTE ───────────── */
const C = {
  navy:"#1e3a5f", navyMd:"#254b7a", navyLt:"#2d5a8e",
  teal:"#0e7490", tealDk:"#0a5568",
  mint:"#0d9488", mintDk:"#0b7a6e",
  purple:"#7c3aed", purpleLt:"#f5f3ff",
  amber:"#d97706", amberBg:"#fef3c7", amberTx:"#92400e",
  green:"#16a34a", greenLt:"#dcfce7",
  gold:"#b45309", goldLt:"#fefce8",
  gray:"#374151", grayMd:"#4b5563", slate:"#64748b",
  bg:"#f0f4f8", white:"#ffffff",
  blue50:"#eff6ff", blue100:"#dbeafe",
  // 5 Pillars
  life:"#dc2626", growth:"#2563eb", connection:"#7c3aed",
  impact:"#16a34a", legacy:"#d97706",
  // Index vs non-index
  inIndex:"#0d9488", outIndex:"#6b7280",
};

/* ───────────── HELPERS ───────────── */
const Tag = ({children, bg=C.navy, tx=C.white, small}) => (
  <span style={{background:bg,color:tx,fontSize:small?9:10,fontWeight:700,
    padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>
    {children}
  </span>
);

const Badge = ({children, color=C.inIndex}) => (
  <span style={{background:color,color:C.white,fontSize:8,fontWeight:700,
    padding:"1px 6px",borderRadius:4,marginLeft:4}}>
    {children}
  </span>
);

const Arrow = ({dir="down",color=C.teal,label}) => {
  if(dir==="right") return (
    <div style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
      <div style={{width:14,height:2,background:color}}/>
      <div style={{width:0,height:0,borderTop:"5px solid transparent",
        borderBottom:"5px solid transparent",borderLeft:`8px solid ${color}`}}/>
      {label&&<span style={{fontSize:8,color:C.slate,marginLeft:3}}>{label}</span>}
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",margin:"3px 0",gap:0}}>
      <div style={{width:2,height:14,background:color}}/>
      <div style={{width:0,height:0,borderLeft:"5px solid transparent",
        borderRight:"5px solid transparent",borderTop:`8px solid ${color}`}}/>
      {label&&<span style={{fontSize:8,color:C.slate,marginTop:2}}>{label}</span>}
    </div>
  );
};

const Box = ({title,icon,items,color=C.navy,badge,tiny,style:s}) => (
  <div style={{background:color,borderRadius:8,padding:tiny?"6px 10px":"10px 12px",color:C.white,...s}}>
    <div style={{fontSize:tiny?9:11,fontWeight:700,marginBottom:items?4:0}}>
      {icon&&<span style={{marginRight:4}}>{icon}</span>}{title}
      {badge&&<Badge color={badge==="in"?C.mint:C.grayMd}>{badge==="in"?"KORA INDEX":"DASH ONLY"}</Badge>}
    </div>
    {items&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>
      {items.map((it,i)=><span key={i} style={{background:"rgba(255,255,255,0.15)",
        fontSize:8.5,padding:"1px 6px",borderRadius:12}}>{it}</span>)}
    </div>}
  </div>
);

const SLabel = ({num,label,accent}) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:5,marginBottom:5}}>
    <span style={{background:accent?C.teal:C.navy,color:C.white,fontSize:9,
      fontWeight:700,padding:"1px 9px",borderRadius:20}}>{num} {label}</span>
  </div>
);

/* ───────────── TAB 1: OVERVIEW ───────────── */
function OverviewTab() {
  return (
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      {/* Header statement */}
      <div style={{background:C.navy,borderRadius:10,padding:"12px 18px",
        marginBottom:14,textAlign:"center"}}>
        <p style={{color:"#93c5fd",fontSize:12,fontWeight:700,margin:0,lineHeight:1.6}}>
          "Il KORA Index non è uno score di marketplace, non è uno score di budget, non è uno score di rete partner e non è uno score ambientale.<br/>
          <span style={{color:C.white}}>È un indice di maturità people-impact costruito da azioni individuali verificate e dai PIB aggregati."</span>
        </p>
      </div>

      {/* Three-column layout */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr",gap:10}}>

        {/* Left: Input Pipeline */}
        <div>
          <SLabel num="①" label="DATA INPUT LAYERS" />
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Box title="Partner KORA Certified (KCP)" icon="⚡"
              items={["palestre","nutrizionisti","psicologi","enti formativi","volontariato","KORA Link"]}
              color={C.teal}/>
            <Box title="Partner Esterni non KCP" icon="🔗"
              items={["welfare","LMS","sanitari","associazioni","piattaforme"]}
              color={C.tealDk}/>
            <Box title="Dati Interni Aziendali" icon="🏢"
              items={["HR records","LMS","payroll","CSR data","team building","KT"]}
              color={C.navyMd}/>
            <Box title="Worker Actions" icon="👤"
              items={["booking","check-in","KORA Link","badge","top-up","co-payment"]}
              color={C.navyLt}/>
            <Box title="Dati Finanziari" icon="💶"
              items={["company fund","budget","partner payout","top-up","KORA fee"]}
              color={C.gray} tiny/>
            <Box title="Dati ESG / Sustainability" icon="🌱"
              items={["ESRS S1/S3/E1","GHG","Scope 1/2/3","energy","mobility"]}
              color={C.green} tiny/>
          </div>
        </div>

        {/* Center: Core Engine */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <SLabel num="②–⑩" label="KORA CORE ENGINE" accent/>
          <Box title="AI Upload Studio / Data Mapping"
            icon="🤖" color={C.teal}
            items={["CSV/API/Manual","event type detection","confidence mapping","human review","audit trail"]}
            style={{width:"100%",marginBottom:5}}/>
          <Arrow label="mapping + review"/>
          <Box title="Privacy & Data Sensitivity" icon="🔐" color={C.purple}
            items={["pseudonymization","sensitive masking","no diagnosis","role-based access","privacy by design"]}
            style={{width:"100%",marginBottom:5}}/>
          <Arrow/>
          <Box title="Data Quality Engine" icon="✅" color={C.tealDk}
            items={["duplicate detect","missing data","confidence score","rejected rows","anomaly check"]}
            style={{width:"100%",marginBottom:5}}/>
          <Arrow/>
          <Box title="UEF — Universal Event Format" icon="📋" color={C.navyMd}
            items={["event_id","worker_id (pseudo)","event_type","source tier","duration","evidence","privacy flag","company/personal/co-pay"]}
            style={{width:"100%",marginBottom:5}}/>
          <Arrow/>
          {/* IU Engine — highlighted */}
          <div style={{background:C.navy,border:`2px solid ${C.mint}`,borderRadius:10,
            padding:12,width:"100%",marginBottom:5}}>
            <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:6}}>
              ⚡ Impact Unit Engine
            </div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#a7f3d0",
              background:"rgba(0,0,0,0.3)",borderRadius:5,padding:"5px 8px",marginBottom:5}}>
              IU = NM × BC × CQ × EV × CF × AGF
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:5}}>
              {["NM","BC","CQ","EV","CF","AGF","DF*","EXF*"].map((f,i)=>(
                <span key={i} style={{background:"rgba(255,255,255,0.15)",
                  color:C.white,fontSize:9,padding:"2px 6px",borderRadius:4,fontWeight:700}}>
                  {f}
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {["LIFE","GROWTH","CONNECTION","IMPACT","LEGACY"].map((p,i)=>(
                <span key={i} style={{background:[C.life,C.growth,C.connection,C.impact,C.legacy][i],
                  color:C.white,fontSize:8,padding:"1px 6px",borderRadius:4,fontWeight:700}}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <Arrow/>
          <div style={{background:C.navyMd,borderRadius:10,padding:12,width:"100%",marginBottom:5}}>
            <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:5}}>
              🔒 PIB Individuale
            </div>
            <div style={{fontFamily:"monospace",fontSize:9.5,color:"#bfdbfe",marginBottom:4}}>
              PIB_w = [LIFE, GROWTH, CONNECTION, IMPACT, LEGACY]<br/>
              PIB_total = Σ pillar IU
            </div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.7)",fontStyle:"italic"}}>
              PIB è il bilancio individuale del lavoratore — interpretabile e auditabile
            </div>
          </div>
          <Arrow label="aggregazione 50 worker"/>
          <Box title="Aggregazione Aziendale" icon="📊" color={C.navyMd}
            items={["Company Total IU","Avg PIB","Gini","Distribution","Pillar Totals"]}
            style={{width:"100%",marginBottom:5}}/>
          <Arrow/>
          {/* Activation Safeguard - amber warning */}
          <div style={{background:C.amberBg,border:`2px solid ${C.amber}`,
            borderRadius:10,padding:10,width:"100%",marginBottom:5}}>
            <div style={{fontSize:11,fontWeight:700,color:C.amberTx,marginBottom:3}}>
              ⚠️ Activation Safeguard / Diffuse Activation Gate
            </div>
            <div style={{fontSize:8.5,color:C.amberTx,lineHeight:1.5,marginBottom:4}}>
              L'alta qualità di pochi lavoratori non può compensare integralmente una bassa attivazione diffusa.
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {["Activation Rate","Meaningful Activation","Low Activation Penalty","Ceiling Rule*"].map((t,i)=>(
                <span key={i} style={{background:"rgba(217,119,6,0.15)",color:C.amberTx,
                  fontSize:8,padding:"1px 6px",borderRadius:4}}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <Arrow/>
          {/* KORA Index */}
          <div style={{background:C.mint,border:`3px solid ${C.white}`,
            borderRadius:12,padding:14,width:"100%",
            boxShadow:"0 4px 20px rgba(13,148,136,0.35)"}}>
            <div style={{fontSize:14,fontWeight:800,color:C.white,marginBottom:6}}>
              🏢 KORA INDEX + Confidence Score
            </div>
            <div style={{fontFamily:"monospace",fontSize:9,color:"#d1fae5",
              background:"rgba(0,0,0,0.2)",borderRadius:5,padding:"4px 8px",marginBottom:6}}>
              f(AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS)
            </div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.85)",lineHeight:1.5,fontStyle:"italic"}}>
              Pesi da calibrare empiricamente — *to be empirically calibrated*
            </div>
          </div>
        </div>

        {/* Right: Complementary Layers */}
        <div>
          <SLabel num="⑪–㉒" label="COMPLEMENTARY LAYERS" />
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <Box title="KORA Evolution" icon="📈" color={C.teal} tiny
              items={["time-series KORA Index","Avg/Median PIB","Pillar Balance trend","Verification trend"]}/>
            <Box title="KORA Contribution" icon="🌍" color={C.green} tiny
              items={["volunteering","community","school orientation","verified beneficiaries","EXF"]}/>
            <Box title="KORA Value Chain" icon="🔗" color={C.navyMd} tiny
              items={["partner quality","advisor validation","relationship depth","audit trail","supplier engagement"]}/>
            <div style={{border:`1px dashed ${C.slate}`,borderRadius:8,padding:8}}>
              <div style={{fontSize:9,fontWeight:700,color:C.slate,marginBottom:4}}>
                ECOSYSTEM INTELLIGENCE
              </div>
              <Box title="Ecosystem Reach" icon="🌐" color={C.grayMd} tiny
                items={["partner disponibili","KCP count","territori","categorie"]}
                style={{marginBottom:4}}/>
              <div style={{fontSize:8,color:C.slate,textAlign:"center",marginBottom:4}}>
                Reach = disponibilità, non impatto
              </div>
              <Box title="Ecosystem Effectiveness" icon="📡" color={C.gray} tiny
                items={["% IU da KCP","partner-to-PIB","need-service fit","partner concentration risk"]}/>
            </div>
            <Box title="Personal Top-Up Continuity" icon="💜" color="#6d28d9" tiny
              items={["top-up user rate","post-budget retention","personal spend","co-payment events"]}/>
            <Box title="Certification / Public Status" icon="🏅" color={C.gold} tiny
              items={["KORA Access","Foundation","Governance","Certified","methodology compliance"]}/>
            <Box title="ESG / GHG Layer" icon="🌱" color={C.green} tiny
              items={["ESRS S1/S3/E1","GHG Scope 1/2/3","NOT → PIB","NOT → KORA Index"]}/>
            <Box title="Financial Governance" icon="💶" color={C.gray} tiny
              items={["budget","cost/IU","ROI dashboard","partner payout","KORA fee"]}/>
            <Box title="Dashboard-only KPIs" icon="📋" color={C.grayMd} tiny
              items={["budget allocato","utilization","partner count","service availability","reporting readiness"]}/>
          </div>

          {/* Stakeholder dashboards */}
          <div style={{marginTop:8}}>
            <SLabel num="㉓" label="DASHBOARDS" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {[
                {icon:"🏢",label:"Azienda",color:C.navy},
                {icon:"👤",label:"Lavoratori",color:C.teal},
                {icon:"🤝",label:"Partner",color:C.tealDk},
                {icon:"🎓",label:"Advisor",color:C.navyMd},
              ].map(({icon,label,color},i)=>(
                <div key={i} style={{background:color,borderRadius:6,padding:"5px 8px",color:C.white}}>
                  <div style={{fontSize:10,fontWeight:700}}>{icon} {label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: What must NOT enter KORA Index */}
      <div style={{marginTop:14,background:"#fef2f2",border:"2px solid #dc2626",
        borderRadius:10,padding:"10px 14px"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#dc2626",marginBottom:5}}>
          ✗ NON ENTRA NEL KORA INDEX
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {["Budget disponibile","Budget speso","N. partner","Ampiezza catalogo","GHG reduction",
            "Scope 1/2/3","N. eventi grezzo","Engagement superficiale","Disponibilità servizi",
            "Ecosystem Reach","Marketplace size","Partner network score"].map((t,i)=>(
            <span key={i} style={{background:"rgba(220,38,38,0.1)",color:"#dc2626",
              fontSize:9,padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── TAB 2: ALGORITHM ───────────── */
function AlgorithmTab() {
  const steps = [
    { num:"①", title:"Raw Events", color:C.teal,
      input:"Tutte le sorgenti dati",
      output:"Record grezzi",
      rule:"Nessun dato grezzo entra nell'algoritmo" },
    { num:"②", title:"AI Upload Studio / Data Mapping", color:C.teal,
      input:"CSV, API, Manual upload",
      output:"Mapped events + confidence",
      rule:"AI suggerisce — non assegna score discrezionali" },
    { num:"③", title:"Privacy & Data Sensitivity", color:C.purple,
      input:"Mapped events",
      output:"Pseudonymized, masked",
      rule:"L'azienda vede aggregati, non contenuti sensibili" },
    { num:"④", title:"Data Quality Engine", color:C.tealDk,
      input:"Pseudonymized events",
      output:"Accepted / Rejected / Review",
      rule:"Qualità tecnica del dato — separata dall'anti-gaming" },
    { num:"⑤", title:"UEF — Universal Event Format", color:C.navyMd,
      input:"Quality-checked events",
      output:"Normalized event records",
      rule:"event_id · worker_id · event_type · source tier · duration · evidence · funding" },
    { num:"⑥", title:"Normalized Magnitude (NM)", color:C.navyMd,
      input:"duration, event_type, category",
      output:"NM value per event",
      rule:"Le ore vengono normalizzate e cappate — non crescita lineare" },
    { num:"⑦", title:"Base Contribution Vector (BC)", color:C.navy,
      input:"event_type",
      output:"[LIFE, GROWTH, CONN, IMPACT, LEGACY] distribution",
      rule:"BC non è un punteggio fisso: definisce dove l'evento contribuisce" },
    { num:"⑧", title:"Correction Factors", color:C.navy,
      input:"event context",
      output:"CQ · EV · CF · AGF · DF · EXF · SF",
      rule:"Ogni fattore applicato solo se le condizioni lo richiedono" },
    { num:"⑨", title:"Anti-Gaming & Anomaly Detection", color:"#7c2d12",
      input:"Events + factors",
      output:"AGF flags + capped IU",
      rule:"Caps, diminishing returns, deduplication, concentration alerts" },
    { num:"⑩", title:"Impact Unit Engine", color:C.navy,
      input:"NM × BC × CQ × EV × CF × AGF",
      output:"IU per event per pillar",
      rule:"IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF]" },
    { num:"⑪", title:"PIB Individuale", color:C.navyMd,
      input:"IU aggregati per worker",
      output:"PIB_w = [LIFE, GROWTH, CONN, IMPACT, LEGACY]",
      rule:"Il PIB è privato, interpretabile, auditabile — non modificato per incentivi artificiali" },
    { num:"⑫", title:"Aggregazione Aziendale", color:C.navyMd,
      input:"50 PIB individuali",
      output:"Company Total IU · Avg PIB · Gini · Distribution",
      rule:"Company Total IU = Σ PIB. Average PIB ≠ KORA Index" },
    { num:"⑬", title:"Activation Safeguard ⚠️", color:C.amber,
      input:"PIB distribution",
      output:"Activation Rate · Meaningful Activation · Penalty",
      rule:"Alta qualità di pochi non compensa bassa attivazione diffusa — soglie da calibrare" },
    { num:"⑭", title:"KORA Index Engine", color:C.mint,
      input:"Distribuzione PIB + componenti aggregate",
      output:"KORA Index [0–100] + Confidence Score",
      rule:"f(AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) — pesi da calibrare empiricamente" },
  ];
  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:0,alignItems:"stretch"}}>
        {steps.map((s,i)=>(
          <>
            <div key={`n${i}`} style={{display:"flex",alignItems:"center",justifyContent:"center",
              padding:"0 8px",
              borderRight:`2px solid ${s.color}`}}>
              <span style={{fontSize:12,fontWeight:800,color:s.color,fontFamily:"monospace"}}>
                {s.num}
              </span>
            </div>
            <div key={`b${i}`} style={{background:s.num==="⑬"?C.amberBg:C.bg,
              border:`1px solid ${s.color}30`,borderLeft:"none",
              padding:"8px 12px",marginBottom:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                marginBottom:3}}>
                <span style={{fontSize:11,fontWeight:700,color:s.num==="⑬"?C.amberTx:s.color}}>
                  {s.title}
                </span>
                {s.num==="⑭"&&<Badge color={C.mint}>KORA INDEX OUTPUT</Badge>}
                {s.num==="⑬"&&<Badge color={C.amber}>ACTIVATION CHECK</Badge>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:4}}>
                <div style={{fontSize:9,color:C.slate}}>
                  <span style={{fontWeight:700}}>IN: </span>{s.input}
                </div>
                <div style={{fontSize:9,color:C.navy}}>
                  <span style={{fontWeight:700}}>OUT: </span>{s.output}
                </div>
              </div>
              <div style={{fontSize:9,color:C.gray,fontStyle:"italic",
                background:"rgba(0,0,0,0.04)",borderRadius:4,padding:"2px 6px"}}>
                {s.rule}
              </div>
            </div>
          </>
        ))}
      </div>

      {/* Side outputs */}
      <div style={{marginTop:12}}>
        <div style={{fontSize:11,fontWeight:700,color:C.navy,marginBottom:8}}>
          Output complementari — separati dal KORA Index
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            {title:"KORA Evolution",icon:"📈",color:C.teal,desc:"Time-series del KORA Index. Non è un indice separato."},
            {title:"KORA Contribution",icon:"🌍",color:C.green,desc:"Contributo sociale/territoriale. Distinto dalla maturità interna."},
            {title:"KORA Value Chain",icon:"🔗",color:C.navyMd,desc:"Qualità relazioni verificate — non dimensione della rete."},
            {title:"Ecosystem Reach",icon:"🌐",color:C.grayMd,desc:"Disponibilità offerta. NON entra nel KORA Index."},
            {title:"Ecosystem Effectiveness",icon:"📡",color:C.gray,desc:"Conversione ecosistema in IU reali. Effetto indiretto."},
            {title:"Personal Top-Up",icon:"💜",color:"#6d28d9",desc:"Uso volontario post-budget. Segnale di valore percepito."},
            {title:"Certification",icon:"🏅",color:C.gold,desc:"Non dipende solo da KORA Index statico."},
            {title:"ESG / GHG Layer",icon:"🌱",color:C.green,desc:"Reporting layer separato. NON → PIB o KORA Index."},
            {title:"Financial Governance",icon:"💶",color:C.gray,desc:"ROI, cost/IU. NON inflaziona KORA Index."},
          ].map(({title,icon,color,desc},i)=>(
            <div key={i} style={{background:color,borderRadius:7,padding:"8px 10px",color:C.white}}>
              <div style={{fontSize:10,fontWeight:700,marginBottom:3}}>{icon} {title}</div>
              <div style={{fontSize:8.5,opacity:0.85,lineHeight:1.4}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── TAB 3: CLASSIFICATION ───────────── */
function ClassificationTab() {
  const sections = [
    { label:"A — Indici Fondativi", color:C.mint, items:[
      "Impact Units (IU)","PIB individuale","KORA Index","KORA Evolution",
      "KORA Contribution","KORA Certification / Public Status"
    ]},
    { label:"B — Layer Complementari", color:C.teal, items:[
      "KORA Value Chain","KORA Ecosystem Reach","KORA Ecosystem Effectiveness",
      "KORA Personal Top-Up Continuity","ESG / Sustainability / GHG Layer",
      "Financial Governance Layer","Public Proof Layer","Benchmark & Normalization Layer"
    ]},
    { label:"C — Dashboard-only KPI", color:C.grayMd, items:[
      "Budget allocato/utilizzato/residuo","Cost per IU","Partner count","Utilization rate",
      "Service availability","Advisor network","Reporting readiness",
      "Risk alerts","Operational KPIs"
    ]},
  ];
  const stakeholders = [
    { label:"🏢 Azienda", color:C.navy, items:[
      "KORA Index · Confidence Score · Evolution","Contribution · Avg/Median PIB",
      "Activation Rate · Meaningful Activation","Worker Balance · Pillar Coverage · Balance",
      "Verification Rate · Event Quality · Continuity","Risk Alerts · Next Best Actions",
      "— op: Workforce Activation Quality","— op: Pillar Gap Index",
      "— op: Program Efficiency Index (dash-only)","— op: Verification Health Score",
      "— op: Impact Risk Alert Index",
    ]},
    { label:"👤 Lavoratori", color:C.teal, items:[
      "PIB individuale · Pillar profile","Dynamic Impact CV · Verified actions",
      "Available budget · Personal top-up","Personal history · Suggested actions",
      "Privacy controls",
      "— op: Personal Pillar Balance","— op: Personal Growth Trajectory",
      "— op: Verified Skill Progress","— op: Personal Continuity Score",
      "— op: Impact Identity Badge Level",
    ]},
    { label:"🤝 Partner", color:C.tealDk, items:[
      "Events generated · Prenotazioni","Utenti serviti · IU generate",
      "Continuità utenti · Feedback","Financials · Advisor validation",
      "Integration quality",
      "— op: Partner Verification Quality","— op: Partner Impact Contribution",
      "— op: Partner Continuity Rate","— op: Service Fit Score",
      "— op: Partner Reliability Index",
      "⚠️ Partner NON ha KORA Index proprio",
    ]},
    { label:"🎓 Advisor", color:C.navyMd, items:[
      "Qualità metodologica · Validazione","Governance · Copertura audit",
      "Risk resolution · Ecosystem design","Miglioramento post-intervento","Compliance",
      "— op: Advisor Validation Coverage","— op: Advisory Impact Improvement",
      "— op: Methodology Compliance Score","— op: Risk Resolution Rate",
      "— op: Ecosystem Design Quality",
    ]},
  ];
  return (
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {sections.map(({label,color,items},i)=>(
          <div key={i} style={{background:color,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:7}}>{label}</div>
            {items.map((it,j)=>(
              <div key={j} style={{fontSize:9.5,color:C.white,borderBottom:"1px solid rgba(255,255,255,0.15)",
                padding:"3px 0",lineHeight:1.4}}>{it}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:C.navy}}>
          D — Indicatori Stakeholder-Specific <span style={{fontSize:9,fontWeight:400,color:C.slate}}>(— op: indicatore operativo)</span>
        </span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {stakeholders.map(({label,color,items},i)=>(
          <div key={i} style={{background:color,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.white,marginBottom:7}}>{label}</div>
            {items.map((it,j)=>(
              <div key={j} style={{fontSize:8.5,
                color:it.startsWith("⚠️")?C.amberBg:it.startsWith("— op")?
                  "rgba(255,255,255,0.7)":C.white,
                borderBottom:"1px solid rgba(255,255,255,0.12)",
                padding:"3px 0",lineHeight:1.4}}>{it}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── TAB 4: GOVERNANCE ───────────── */
function GovernanceTab() {
  const sections = [
    { title:"Algorithm Governance", color:C.navy, icon:"⚙️", items:[
      ["PIB obbligatorio","Ogni calcolo deve passare per i PIB individuali — mai aggregazione diretta"],
      ["Formula pubblica","La formula IU è documentata e versionata — nessun black box"],
      ["Weights disclosure","I pesi del KORA Index devono essere pubblicati con status: to be calibrated"],
      ["Activation Safeguard","Bassa partecipazione diffusa non può essere compensata da alta qualità di pochi — soglie da calibrare empiricamente"],
      ["Confidence Score","Ogni KORA Index ha un Confidence Score — due aziende con stesso score ma diversa confidenza sono diverse"],
      ["Anti-gaming strutturale","Il sistema non deve dipendere da detection esplicita del gaming — caps, bassa verifica e bilanciamento riducono strutturalmente l'impatto"],
      ["Outcome correlation","KORA non dichiara causalità con outcome aziendali senza validazione longitudinale"],
      ["Human review","La revisione umana può validare o respingere evidenze — non può aumentare arbitrariamente gli score"],
    ]},
    { title:"Data Governance", color:C.tealDk, icon:"🗄️", items:[
      ["Methodology versioning","Ogni calcolo riporta: algorithm version · BCM version · NM rules · correction factors version"],
      ["Historical comparability","Se la metodologia cambia, gli score storici devono restare tracciabili"],
      ["Audit trail","Ogni IU è riconducibile all'evento originale, al worker pseudonymized, alla fonte"],
      ["Data Quality separato","Il Data Quality Engine verifica affidabilità tecnica del dato — distinto dall'anti-gaming"],
      ["Rejected events","Ogni evento rifiutato ha rejection_reason documentato"],
      ["Recalculation policy","Definire policy di ricalcolo quando metodologia cambia — retroattività?"],
      ["Human Review log","Ogni intervento advisor ha: ID · timestamp · reason code · before/after status"],
      ["Benchmark layer","Comparabilità tra aziende richiede normalizzazione per settore, size, workforce mix — advanced future layer"],
    ]},
    { title:"Privacy & Data Sensitivity", color:C.purple, icon:"🔐", items:[
      ["Privacy by design","Pseudonymization al momento dell'ingestion — non a posteriori"],
      ["Sensitive masking","Diagnosi, contenuti psicologici, note mediche: mai visibili all'azienda"],
      ["Aggregation thresholds","Output aggregati solo per gruppi > N (soglia da definire, es. N=5)"],
      ["Company view","L'azienda vede aggregati e PIB anonimi — non contenuti personali"],
      ["Worker consent","Legal basis per ogni tipo di dato — documentata nell'UEF"],
      ["Role-based access","Azienda · Lavoratore · Partner · Advisor hanno viste diverse e limitate"],
      ["KORA measures participation","KORA misura partecipazione verificata, non contenuti personali sensibili"],
      ["Equity data","Dati sensibili per equity (genere, età, disabilità) solo se legalmente e eticamente consentito"],
    ]},
    { title:"Methodology Versioning", color:C.gold, icon:"📌", items:[
      ["BCM version","Ogni versione della Base Contribution Matrix è numerata e documentata"],
      ["NM rules version","Le regole di Normalized Magnitude sono versioniate separatamente"],
      ["Correction factors","CQ, EV, CF, AGF, DF, EXF: ogni tabella di valori ha versione"],
      ["KORA Index weights","I pesi sono versionati — cambio pesi = nuova versione"],
      ["Pre-empirical status","Tutti i parametri correnti sono prior teorici — status dichiarato"],
      ["Delphi Study","Validazione BCM tramite Delphi Study con 15-20 esperti: fase 1 della roadmap"],
      ["Calibration roadmap","Fase 1: stress test simulato → Fase 2: pilot reale → Fase 3: calibrazione statistica"],
      ["Change log","Ogni release della metodologia ha change log pubblico"],
    ]},
  ];
  return (
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        {sections.map(({title,color,icon,items},si)=>(
          <div key={si} style={{background:C.bg,border:`1px solid ${color}40`,borderRadius:10,overflow:"hidden"}}>
            <div style={{background:color,padding:"8px 12px"}}>
              <span style={{fontSize:12,fontWeight:700,color:C.white}}>{icon} {title}</span>
            </div>
            <div style={{padding:"8px 12px"}}>
              {items.map(([k,v],i)=>(
                <div key={i} style={{marginBottom:5}}>
                  <span style={{fontSize:9.5,fontWeight:700,color}}>{k}: </span>
                  <span style={{fontSize:9.5,color:C.gray}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* What must NOT enter KORA Index */}
      <div style={{background:"#fef2f2",border:"2px solid #dc2626",borderRadius:10,padding:"12px 16px"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>
          ✗ WHAT MUST NOT BE INCLUDED IN THE KORA INDEX
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[
            ["Budget disponibile / speso","Misura input economico, non output comportamentale"],
            ["Numero partner disponibili","Misura disponibilità offerta, non utilizzo o impatto"],
            ["KORA Ecosystem Reach","Disponibilità ≠ impatto — dashboard separata"],
            ["GHG / Scope 1-2-3","Metriche ambientali aziendali — ESG Reporting Layer"],
            ["Numero grezzo di eventi","Quantità senza qualità è manipolabile facilmente"],
            ["Marketplace size / catalogo","Amplezza offerta non genera automaticamente PIB"],
            ["Engagement superficiale","Survey non verificate, comunicazione interna"],
            ["Disponibilità teorica servizi","Un servizio disponibile ma non usato = PIB zero"],
            ["Partner network score","La rete misura capacità potenziale, non impatto reale"],
            ["Budget per lavoratore","Correlato con spesa, non con azioni e Impact Units"],
          ].map(([title,reason],i)=>(
            <div key={i} style={{background:"rgba(220,38,38,0.06)",
              borderRadius:6,padding:"5px 8px"}}>
              <div style={{fontSize:9.5,fontWeight:700,color:"#dc2626"}}>{title}</div>
              <div style={{fontSize:8.5,color:"#7f1d1d"}}>{reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── TAB 5: ADVANCED LAYERS ───────────── */
function AdvancedTab() {
  const layers = [
    {num:"①",name:"Equity & Inclusion Layer",color:"#7c3aed",
      desc:"Misura chi resta fuori. Bottom 20% activation, department gap, shift worker gap, accessibility. Dati sensibili solo se legalmente consentito.",
      note:"Equità = chi ha accesso all'impatto, non solo quanto impatto viene generato"},
    {num:"②",name:"Next Best Action Engine",color:C.mint,
      desc:"Trasforma la misurazione in governance. Genera raccomandazioni su pillar gap, bassa attivazione, verification weakness, partner underuse.",
      note:"Ex: IMPACT basso → attivare progetto territoriale con KCP, target 20% workforce"},
    {num:"③",name:"Outcome Correlation Layer",color:C.navyMd,
      desc:"Correla indicatori con outcome aziendali (turnover, retention, absenteeism, safety) nel tempo. Non dichiara causalità senza validazione longitudinale.",
      note:"Correlazione ≠ causalità — validazione longitudinale obbligatoria prima di dichiarare impatto"},
    {num:"④",name:"Benchmark & Normalization Layer",color:C.gray,
      desc:"Normalizzazione per settore, dimensione, territorio, workforce mix, maturity stage. Rende il KORA Index comparabile tra aziende diverse.",
      note:"KORA Index deve diventare comparabile — ma non ingenuamente comparabile"},
    {num:"⑤",name:"Public / External Proof Layer",color:C.gold,
      desc:"QR-verifiable snapshot, certified badge, metodologia pubblica, stakeholder report. Diversi livelli: private / advisor / executive / public.",
      note:"La prova pubblica espone metodologia e status — non dati sensibili dei lavoratori"},
    {num:"⑥",name:"Human Review & Advisor Audit Log",color:C.amber,
      desc:"Gli advisor possono validare/respingere evidenze ma non aumentare arbitrariamente gli score. Ogni intervento: advisor ID + timestamp + reason code + before/after.",
      note:"Human review can validate or reject evidence, but cannot arbitrarily inflate scores"},
    {num:"⑦",name:"Methodology Versioning Layer",color:C.tealDk,
      desc:"algorithm version, BCM version, NM rules, correction factors, KORA Index weights, recalculation policy. Historical scores restano tracciabili.",
      note:"Se la metodologia cambia, gli score storici devono restare tracciabili"},
    {num:"⑧",name:"Confidence Score Layer",color:C.teal,
      desc:"Ogni KORA Index ha un confidence level. Dipende da: verification rate, KCP share, data completeness, audit trail, observation period, self-declared %.",
      note:"Due aziende con stesso KORA Index ma diversa confidence sono metodologicamente diverse"},
  ];
  return (
    <div style={{maxWidth:1080,margin:"0 auto"}}>
      <div style={{marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:700,color:C.navy}}>Layer avanzati dell'architettura KORA</span>
        <span style={{fontSize:10,color:C.slate,marginLeft:8}}>— non alterano il KORA Index ma lo rendono governabile, equo e verificabile</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {layers.map(({num,name,color,desc,note},i)=>(
          <div key={i} style={{border:`1px solid ${color}40`,borderRadius:10,overflow:"hidden"}}>
            <div style={{background:color,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:9,fontWeight:700,color:C.white,background:"rgba(0,0,0,0.2)",
                borderRadius:20,padding:"0px 6px"}}>{num}</span>
              <span style={{fontSize:11,fontWeight:700,color:C.white}}>{name}</span>
            </div>
            <div style={{padding:"8px 12px",background:C.bg}}>
              <p style={{fontSize:9.5,color:C.gray,margin:"0 0 5px",lineHeight:1.5}}>{desc}</p>
              <div style={{background:`${color}15`,borderRadius:5,padding:"4px 8px",
                fontSize:8.5,color:color,fontStyle:"italic"}}>{note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── MAIN ───────────── */
export default function KORAArchV3() {
  const [tab, setTab] = useState("overview");
  const tabs = [
    {id:"overview",label:"① Architecture Overview"},
    {id:"algorithm",label:"② Core Algorithm"},
    {id:"classification",label:"③ KPI Classification"},
    {id:"governance",label:"④ Governance & Privacy"},
    {id:"advanced",label:"⑤ Advanced Layers"},
  ];
  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:C.bg,minHeight:"100vh",padding:16}}>
      {/* Header */}
      <div style={{background:C.navy,borderRadius:12,padding:"14px 20px",marginBottom:14,
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h1 style={{fontSize:18,fontWeight:800,color:C.white,margin:0,letterSpacing:"-0.01em"}}>
            KORA Architecture v3.0
          </h1>
          <p style={{fontSize:10,color:"#93c5fd",margin:"4px 0 0"}}>
            Impact Intelligence Platform — System Architecture & Methodology Reference
          </p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>
            Standard-ready · Pre-empirical calibration
          </div>
          <div style={{fontSize:9,color:"#34d399",fontWeight:700}}>
            Actions are the unit.
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:"rgba(30,58,95,0.08)",
        padding:4,borderRadius:10}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",
            fontSize:10,fontWeight:600,
            background:tab===t.id?C.navy:"transparent",
            color:tab===t.id?C.white:C.navyMd,
            transition:"all 0.15s",flex:1
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {tab==="overview"    && <OverviewTab/>}
      {tab==="algorithm"   && <AlgorithmTab/>}
      {tab==="classification" && <ClassificationTab/>}
      {tab==="governance"  && <GovernanceTab/>}
      {tab==="advanced"    && <AdvancedTab/>}

      {/* Footer */}
      <div style={{marginTop:16,textAlign:"center",fontSize:8.5,color:C.slate}}>
        KORA Architecture v3.0 — Methodology Reference · All parameters pre-empirical · To be validated
      </div>
    </div>
  );
}
