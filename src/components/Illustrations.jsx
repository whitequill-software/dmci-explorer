export function Explorer({className=''}) {
 return <svg className={className} viewBox="0 0 220 280" role="img" aria-label="A cheerful little explorer wearing a safari hat and holding a map">
  <ellipse cx="110" cy="263" rx="58" ry="10" fill="#365442" opacity=".12"/>
  <path d="M63 144q-22 26-14 69l26 3 7-65" fill="#b98853"/><path d="m89 212-5 38q-14 16 16 11l14-40m13-9 8 39q-5 17 20 8l-8-48" fill="#684b37"/>
  <path d="M76 143q35-22 68 0l14 74q-44 21-88-2z" fill="#e7b762"/><path d="m111 145 6 71m-42-38 70 0" fill="none" stroke="#bd8f47" strokeWidth="3"/><path d="m88 149 21 14 19-15" fill="#f8e6b8"/>
  <ellipse cx="110" cy="100" rx="49" ry="48" fill="#f4c49e"/><circle cx="62" cy="106" r="11" fill="#f4c49e"/><circle cx="158" cy="106" r="11" fill="#f4c49e"/>
  <path d="M66 90q-10-43 43-46 50 2 48 46l-14-12-17 1-12-10-33 10z" fill="#503b2c"/>
  <ellipse cx="109" cy="66" rx="70" ry="15" fill="#d3a361"/><path d="m67 59 9-34q30-18 65 0l11 34z" fill="#edc788"/><path d="m72 45 74 0 5 14-83 0" fill="#6a7650"/>
  <circle cx="92" cy="101" r="5" fill="#453b30"/><circle cx="131" cy="101" r="5" fill="#453b30"/><circle cx="82" cy="116" r="8" fill="#e99d84" opacity=".7"/><circle cx="142" cy="116" r="8" fill="#e99d84" opacity=".7"/><path d="M99 119q12 16 25-1" fill="#fff9ee" stroke="#925b43" strokeWidth="3" strokeLinecap="round"/>
  <path d="m135 177 32-13 30 11-10 54-29-8-27 9z" fill="#fffae9" stroke="#baac7c" strokeWidth="2"/><path d="m167 165-8 54m14-34 11 6-11 13m-34 9 12-19 10 7" fill="none" stroke="#80a389" strokeWidth="3"/>
  <path d="M69 164q-23 7-8 29l29 8 6-15-21-9m66-13 23 12-7 15-22-12" fill="#f4c49e"/><circle cx="91" cy="193" r="9" fill="#f4c49e"/>
 </svg>;
}
export function Neighborhood({className=''}) {
 return <svg className={className} viewBox="0 0 640 450" role="img" aria-label="Illustrated condominium neighborhood with leafy gardens and a family walking together">
 <defs><pattern id="windows" width="29" height="31" patternUnits="userSpaceOnUse"><rect x="6" y="8" width="14" height="18" rx="2" fill="#9bb7aa"/><path d="M13 8v18" stroke="#e9eee1" strokeWidth="2"/></pattern><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#e2e9d8"/><stop offset="1" stopColor="#f6f1df"/></linearGradient></defs>
 <path d="M42 366V165Q48 23 300 29q269-1 295 173v164Z" fill="url(#sky)"/><circle cx="476" cy="94" r="38" fill="#f3cf86"/><path d="M85 98h75m-40-13h70m260 77h73" stroke="#fffdf1" strokeWidth="12" strokeLinecap="round"/>
 <path d="m92 334 0-144 115-18 0 162" fill="#e8d8b8"/><path d="M107 194h83v130h-83z" fill="url(#windows)"/>
 <path d="M225 340V102l150-17v255" fill="#f2ebd7"/><path d="m375 85 39 28v228h-39z" fill="#bac7b3"/><path d="M241 120h117v207H241z" fill="url(#windows)"/><path d="m217 101 160-19 43 30-9 9-37-24-153 17z" fill="#5d7c63"/>
 <path d="M428 343V190l105 12v141" fill="#e6dbc0"/><path d="M443 211h76v118h-76z" fill="url(#windows)"/>
 <ellipse cx="320" cy="360" rx="286" ry="57" fill="#b3c69b"/><path d="M84 394q150-90 469-24l-15 48q-245-67-347 13z" fill="#ede4c9"/>
 {[ [92,297,50],[528,300,54],[186,334,26],[443,335,23] ].map(([x,y,r])=><g key={x}><path d={`M${x} ${y}v75`} stroke="#817754" strokeWidth="8"/><circle cx={x} cy={y} r={r} fill="#668765"/><circle cx={x-15} cy={y-13} r={r*.7} fill="#79996d"/></g>)}
 <path d="M53 371q-8-36-20-22m23 18q18-40 30-25m470 31q13-38 27-25" fill="none" stroke="#739064" strokeWidth="9" strokeLinecap="round"/>
 <g strokeLinecap="round"><circle cx="307" cy="332" r="13" fill="#b97952"/><path d="m296 351-5 38h33l-7-38" fill="#d99866"/><path d="m301 388-4 28m18-28 4 28" stroke="#425d4d" strokeWidth="10"/><path d="m297 358-18 18m39-17 17 18" stroke="#b97952" strokeWidth="8"/>
 <circle cx="360" cy="336" r="12" fill="#e4b28d"/><path d="m350 352-8 40h34l-9-40" fill="#f5ebcf"/><path d="m351 392-3 22m19-22 3 22" stroke="#c49672" strokeWidth="8"/><path d="m350 360-17 16m33-17 16 15" stroke="#e4b28d" strokeWidth="7"/>
 <circle cx="335" cy="373" r="9" fill="#e5b18b"/><path d="m329 383-3 23h18l-4-23" fill="#789681"/><path d="m330 405-2 14m11-14 2 14" stroke="#846c4e" strokeWidth="6"/><path d="m328 385-10-15m23 15 9-16" stroke="#e5b18b" strokeWidth="5"/></g>
 <g fill="#fff8e4"><circle cx="144" cy="358" r="4"/><circle cx="481" cy="368" r="4"/><circle cx="467" cy="363" r="3"/></g>
 </svg>;
}
export function FloorPlan({beds=2}) {
 return <svg viewBox="0 0 330 200" role="img" aria-label={`Conceptual ${beds}-bedroom floor plan, not an actual unit layout`}>
 <rect x="20" y="15" width="290" height="170" rx="3" fill="#fffdf4" stroke="#79917b" strokeWidth="4"/><path d="M154 15v170M20 100h134M154 128h156M246 128v57" fill="none" stroke="#79917b" strokeWidth="4"/>
 {beds===3&&<path d="M230 15v113M230 113h80" stroke="#79917b" strokeWidth="4"/>}
 <g fill="#d6dfc9" stroke="#9eaf91" strokeWidth="2"><rect x="42" y="33" width="69" height="47" rx="3"/><rect x="42" y="120" width="69" height="47" rx="3"/><rect x="177" y="143" width="44" height="25" rx="3"/>{beds===3?<rect x="248" y="35" width="43" height="52" rx="3"/>:<rect x="257" y="35" width="28" height="63" rx="3"/>}</g>
 <g fill="#fff9ec"><rect x="47" y="37" width="23" height="12" rx="2"/><rect x="82" y="37" width="23" height="12" rx="2"/><rect x="47" y="124" width="23" height="12" rx="2"/></g>
 <circle cx="198" cy="75" r="24" fill="#eed4aa"/><rect x="268" y="143" width="25" height="25" rx="6" fill="#e2e5d7"/>
 <path d="M23 37v33m0 55v35m285-124v56" stroke="#c1dce0" strokeWidth="6"/>
 </svg>;
}
