// =====================================================================
//  BrickLift — card drawings, shared by the site and by the editor.
//  Each drawing is a blueprint first; on hover it turns into the real
//  building (see .drawn in style.css).
// =====================================================================
const ART = {
  house: `
    <rect class="fill" x="62" y="72" width="116" height="58" fill="#f1e6d4"/>
    <path class="fill" d="M54 74 120 30 186 74Z" fill="#b4513a"/>
    <rect class="fill" x="140" y="34" width="12" height="24" fill="#9a4a35"/>
    <rect class="fill" x="110" y="98" width="20" height="32" fill="#6b3f2a"/>
    <rect class="win" x="76" y="86" width="22" height="18"/><rect class="win" x="142" y="86" width="22" height="18"/>
    <path class="ln" pathLength="1" d="M18 130H222"/>
    <path class="ln" pathLength="1" d="M62 130V72H178V130"/>
    <path class="ln" pathLength="1" d="M54 74 120 30 186 74"/>
    <path class="ln" pathLength="1" d="M140 47V34H152V55"/>
    <path class="ln" pathLength="1" d="M110 130V98H130V130"/>
    <rect class="ln" pathLength="1" x="76" y="86" width="22" height="18"/><rect class="ln" pathLength="1" x="142" y="86" width="22" height="18"/>`,
  cottage: `
    <rect class="fill" x="40" y="88" width="160" height="42" fill="#d9a46c"/>
    <path class="fill" d="M30 90 120 34 210 90Z" fill="#353b48"/>
    <rect class="fill" x="44" y="126" width="152" height="6" fill="#9b6a43"/>
    <path class="win" d="M98 90 120 62 142 90Z"/>
    <rect class="win" x="58" y="98" width="34" height="26"/><rect class="win" x="150" y="98" width="34" height="26"/>
    <path class="ln" pathLength="1" d="M18 130H222"/>
    <path class="ln" pathLength="1" d="M40 130V88H200V130"/>
    <path class="ln" pathLength="1" d="M30 90 120 34 210 90"/>
    <path class="ln" pathLength="1" d="M98 90 120 62 142 90Z"/>
    <path class="ln" pathLength="1" d="M108 130V100H132V130"/>
    <rect class="ln" pathLength="1" x="58" y="98" width="34" height="26"/><rect class="ln" pathLength="1" x="150" y="98" width="34" height="26"/>`,
  townhouse: `
    <rect class="fill" x="30" y="66" width="60" height="64" fill="#e3d3bd"/>
    <rect class="fill" x="90" y="58" width="60" height="72" fill="#c98f6b"/>
    <rect class="fill" x="150" y="66" width="60" height="64" fill="#e3d3bd"/>
    <path class="fill" d="M26 68 60 42 94 68ZM86 60 120 32 154 60ZM146 68 180 42 214 68Z" fill="#4a5163"/>
    <g class="win"><rect x="40" y="78" width="16" height="14"/><rect x="64" y="78" width="16" height="14"/><rect x="100" y="72" width="16" height="14"/><rect x="124" y="72" width="16" height="14"/><rect x="160" y="78" width="16" height="14"/><rect x="184" y="78" width="16" height="14"/></g>
    <path class="ln" pathLength="1" d="M18 130H222"/>
    <path class="ln" pathLength="1" d="M30 130V66H90V58H150V66H210V130"/>
    <path class="ln" pathLength="1" d="M90 130V66M150 130V66"/>
    <path class="ln" pathLength="1" d="M26 68 60 42 94 68M86 60 120 32 154 60M146 68 180 42 214 68"/>
    <path class="ln" pathLength="1" d="M52 130V108H68V130M112 130V106H128V130M172 130V108H188V130"/>`,
  tower: `
    <rect class="fill" x="92" y="24" width="56" height="106" fill="#2a4a7a"/>
    <rect class="fill" x="62" y="96" width="38" height="34" fill="#e3e6ee"/>
    <rect class="fill" x="152" y="80" width="40" height="50" fill="#d9dde6"/>
    <g class="win"><rect x="100" y="34" width="14" height="10"/><rect x="126" y="34" width="14" height="10"/><rect x="100" y="56" width="14" height="10"/><rect x="126" y="78" width="14" height="10"/><rect x="100" y="100" width="14" height="10"/><rect x="70" y="104" width="10" height="8"/><rect x="160" y="90" width="10" height="8"/><rect x="174" y="106" width="10" height="8"/></g>
    <path class="ln" pathLength="1" d="M18 130H222"/>
    <path class="ln" pathLength="1" d="M92 130V24H148V130"/>
    <path class="ln" pathLength="1" d="M92 46H148M92 68H148M92 90H148M92 112H148"/>
    <path class="ln" pathLength="1" d="M120 24V10"/>
    <path class="ln" pathLength="1" d="M62 130V96H100M148 80H192V130"/>
    <path class="ln" pathLength="1" d="M206 130V18H136M206 18H226M196 18 206 8 216 18M168 18V46"/>`,
  office: `
    <rect class="fill" x="48" y="40" width="144" height="90" fill="#9fb4d8"/>
    <rect class="fill" x="40" y="34" width="160" height="8" fill="#4a5163"/>
    <g class="win"><rect x="58" y="52" width="26" height="16"/><rect x="92" y="52" width="26" height="16"/><rect x="156" y="52" width="26" height="16"/><rect x="58" y="78" width="26" height="16"/><rect x="124" y="78" width="26" height="16"/><rect x="156" y="78" width="26" height="16"/><rect x="92" y="104" width="26" height="16"/></g>
    <path class="ln" pathLength="1" d="M18 130H222"/>
    <path class="ln" pathLength="1" d="M48 130V42H192V130"/>
    <path class="ln" pathLength="1" d="M40 42V34H200V42"/>
    <path class="ln" pathLength="1" d="M48 72H192M48 98H192"/>
    <path class="ln" pathLength="1" d="M88 42V130M120 42V130M152 42V130"/>
    <path class="ln" pathLength="1" d="M128 130V106H146V130"/>`,
  plan: `
    <rect class="fill" x="40" y="22" width="160" height="104" fill="#f4efe6"/>
    <rect class="fill" x="122" y="26" width="74" height="52" fill="#d9c7a8"/>
    <rect class="win" x="44" y="82" width="74" height="40" style="fill:#c9d8c0"/>
    <path class="ln" pathLength="1" d="M40 22H200V126H40Z"/>
    <path class="ln" pathLength="1" d="M120 22V70M120 92V126M120 78H200"/>
    <path class="ln" pathLength="1" d="M40 78H86"/>
    <path class="ln" pathLength="1" d="M120 70A22 22 0 0 0 98 92"/>
    <path class="ln" pathLength="1" d="M40 138H200M40 134V142M200 134V142"/>
    <path class="ln" pathLength="1" d="M214 34 226 22 230 26 218 38 210 40Z"/>`,
};

// building types: label on the card + which drawing to use without a photo
const TYPES = {
  house: {label: "House", art: "house"},
  cottage: {label: "Cottage", art: "cottage"},
  townhouse: {label: "Townhouse", art: "townhouse"},
  apartments: {label: "Apartments", art: "tower"},
  office: {label: "Office", art: "office"},
  renovation: {label: "Renovation", art: "plan"},
};

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
}

// One project card. `resolve` lets the editor show photos that are not saved yet.
function renderProjectCard(p, {resolve = src => src} = {}) {
  const type = TYPES[p.type] || TYPES.house;
  const card = document.createElement("article");
  card.className = "card project drawn reveal";
  const visual = p.image
    ? `<div class="service-art project-shot"><img src="${escapeHtml(resolve(p.image))}" alt="${escapeHtml(p.title)}" loading="lazy"></div>`
    : `<div class="service-art"><svg viewBox="0 0 240 150" aria-hidden="true">${ART[type.art]}</svg></div>`;
  const facts = [["Area", p.area], ["Built in", p.time]].filter(([, v]) => v && String(v).trim());
  card.innerHTML = `${visual}
    <div class="project-top"><span class="project-tag">${type.label}</span><span class="project-year">${escapeHtml(p.year)}</span></div>
    <h3>${escapeHtml(p.title) || "Untitled project"}</h3>
    ${p.text ? `<p>${escapeHtml(p.text)}</p>` : ""}
    ${facts.length ? `<dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>` : ""}`;
  return card;
}
