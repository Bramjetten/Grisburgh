import { api } from './api.js';

const CATEGORIES = [
  { key: 'alle', label: 'Alle', icon: '' },
  { key: 'brieven', label: 'Brieven & Documenten', icon: '\ud83d\udcdc' },
  { key: 'pers', label: 'Gedrukte Pers', icon: '\ud83d\uddde' },
  { key: 'kaarten', label: 'Kaarten', icon: '\ud83d\uddfa' },
  { key: 'codex', label: 'Codex & Emblema', icon: '\ud83d\udd0f' },
  { key: 'logboek', label: 'Logboek', icon: '\ud83d\udcd6' },
];

const DOC_TYPES = ['Brief','Krant','Kaart','Manuscript','Kasboek','Notities','Folder','Gebed','Blauwdruk','Embleem','Visitekaartje','Gedicht','Dreigbrief','Catalogus','Menu','Stadskaart','Wereldkaart','Dungeon map','Overig'];
const DOC_CATS = ['brieven','pers','kaarten','codex','logboek'];

let activeCat = 'alle';
let searchQuery = '';
let archiefData = { documents: [], logEntries: [], hiddenLinks: {}, tekstContent: {} };
let meta = null;

// Lazy proxies — window.app isn't set yet when ES modules evaluate
const $ = (...a) => window.app.$(...a);
const isDM = () => window.app.isDM();
const esc = (...a) => window.app.esc(...a);
const openModal = (...a) => window.app.openModal(...a);
const closeModal = (...a) => window.app.closeModal(...a);
const openLightbox = (...a) => window.app.openLightbox(...a);

export function initArchief() {}

export async function renderArchief() {
  const container = $('#section-archief');
  try {
    archiefData = await api.listArchief();
    meta = window.app.state.meta;
  } catch { /* empty */ }

  const docs = filterDocs();
  const counts = {};
  counts.alle = (archiefData.documents || []).length;
  for (const c of DOC_CATS) {
    counts[c] = (archiefData.documents || []).filter(d => d.cat === c).length;
  }
  counts.logboek = (archiefData.logEntries || []).length;

  container.innerHTML = `
    <!-- Category tabs -->
    <div class="flex gap-1 px-6 py-2 border-b border-room-border bg-room-surface/50 flex-wrap">
      ${CATEGORIES.map(c => `
        <button class="cat-tab px-3 py-1.5 text-xs font-cinzel font-semibold rounded-t transition
          ${c.key === activeCat ? 'text-gold border-b-2 border-gold bg-room-elevated' : 'text-ink-dim hover:text-ink-medium'}"
          data-cat="${c.key}">
          ${c.icon} ${c.label}
          <span class="ml-1 text-[10px] font-mono opacity-60">${counts[c.key] || 0}</span>
        </button>
      `).join('')}
    </div>

    <!-- Search -->
    <div class="flex items-center gap-3 px-6 py-3 bg-room-surface/30">
      <div class="relative flex-1 max-w-md">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">\u2315</span>
        <input type="text" class="search-input w-full pl-9 pr-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-sm font-crimson focus:border-gold-dim focus:outline-none"
          placeholder="Zoek document..." value="${esc(searchQuery)}" oninput="window._archiefSearch(this.value)">
      </div>
      <span class="text-ink-faint text-xs font-mono">${activeCat === 'logboek' ? (archiefData.logEntries || []).length : docs.length} resultaten</span>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6" id="archief-content">
      ${activeCat === 'logboek' ? renderLogboek() : renderDocGrid(docs)}
    </div>
  `;

  container.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      searchQuery = '';
      renderArchief();
    });
  });

  window._archiefSearch = (q) => {
    searchQuery = q;
    renderArchief();
  };
}

function filterDocs() {
  let docs = archiefData.documents || [];
  if (activeCat !== 'alle') docs = docs.filter(d => d.cat === activeCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    docs = docs.filter(d => {
      return [d.name, d.type, d.desc, ...(d.npcs||[]), ...(d.locs||[]), ...(d.docs||[])].join(' ').toLowerCase().includes(q);
    });
  }
  return docs;
}

function renderDocGrid(docs) {
  if (docs.length === 0) {
    return `<div class="text-center py-16 text-ink-faint">
      <div class="text-4xl mb-3">\ud83d\udcdc</div>
      <div class="font-fell italic">Geen documenten gevonden</div>
    </div>`;
  }
  return `<div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
    ${docs.map(d => renderDocCard(d)).join('')}
  </div>`;
}

function renderDocCard(d) {
  const state = d.state || 'hidden';
  const hoofdstuk = meta?.hoofdstukken?.[d.hoofdstuk];
  const chapterLabel = hoofdstuk ? hoofdstuk.short : '';
  const hiddenLinks = archiefData.hiddenLinks?.[d.id] || {};

  // Filter chips for hidden links
  const npcs = (d.npcs || []).filter(n => !(hiddenLinks.npcs || []).includes(n));
  const locs = (d.locs || []).filter(n => !(hiddenLinks.locs || []).includes(n));

  const isBlurred = !isDM() && state === 'blurred';

  return `
    <div class="border rounded-lg cursor-pointer hover:-translate-y-0.5 hover:shadow-deep transition relative cat-${d.cat || 'brieven'} ${isDM() && state !== 'revealed' ? 'state-' + state : ''}"
      onclick="window._openDoc('${d.id}')">
      ${isDM() ? `
        <div class="dm-only absolute top-2 right-2 z-10 flex gap-0.5 bg-black/80 rounded p-0.5">
          ${['hidden','blurred','revealed'].map(s => `
            <button class="text-[11px] px-1.5 py-0.5 rounded transition ${state === s ? 'bg-gold-dim text-black' : 'text-ink-dim hover:bg-room-border'}"
              onclick="event.stopPropagation();window._setDocState('${d.id}','${s}')"
              title="${s}">${s === 'hidden' ? '\ud83d\udd12' : s === 'blurred' ? '\ud83d\udc41\u200d\ud83d\udde8' : '\u2728'}</button>
          `).join('')}
        </div>
      ` : ''}
      <img class="w-full h-32 object-cover rounded-t-lg ${isBlurred ? 'blur-lg select-none' : ''}" src="${api.fileUrl(d.id)}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="h-1 rounded-t-lg" style="display:none"></div>
      <div class="doc-card-body p-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="text-2xl">${d.icon || '\ud83d\udcdc'}</div>
          <div class="min-w-0">
            <div class="font-cinzel font-bold truncate">${esc(d.name)}</div>
            <div class="text-xs opacity-60">${esc(d.type)}${chapterLabel ? ' \u00b7 ' + esc(chapterLabel) : ''}</div>
          </div>
        </div>
        ${isBlurred
          ? `<p class="text-sm opacity-50 italic">Dit document is nog niet volledig onthuld</p>`
          : `${d.desc ? `<p class="text-sm opacity-80 line-clamp-2 mb-2">${esc(d.desc)}</p>` : ''}
             <div class="flex flex-wrap gap-1">
               ${npcs.slice(0,2).map(n => `<span class="chip chip-npc">\ud83d\udc64 ${esc(n)}</span>`).join('')}
               ${locs.slice(0,2).map(n => `<span class="chip chip-loc">\ud83c\udff0 ${esc(n)}</span>`).join('')}
             </div>`
        }
      </div>
    </div>
  `;
}

function renderLogboek() {
  const entries = archiefData.logEntries || [];
  if (entries.length === 0) {
    return `<div class="text-center py-16 text-ink-faint">
      <div class="text-4xl mb-3">\ud83d\udcd6</div>
      <div class="font-fell italic">Nog geen logboek-entries</div>
    </div>`;
  }

  const hk = meta?.hoofdstukken || {};
  // Group by chapter
  const groups = {};
  for (const e of entries) {
    const ch = e.hoofdstuk || 'onbekend';
    if (!groups[ch]) groups[ch] = [];
    groups[ch].push(e);
  }

  // Sort chapters
  const sortedChapters = Object.keys(groups).sort((a, b) => {
    return (hk[a]?.num || 99) - (hk[b]?.num || 99);
  });

  let html = '<div class="space-y-6">';
  for (const ch of sortedChapters) {
    const info = hk[ch] || { title: ch, dag: '' };
    html += `
      <div>
        <div class="font-cinzel font-bold text-gold text-lg mb-1">Hoofdstuk ${info.num || '?'}: ${esc(info.title)}</div>
        <div class="text-ink-dim text-sm italic mb-3">${esc(info.dag)}</div>
        <div class="space-y-3 border-l-2 border-room-border pl-4">
          ${groups[ch].sort((a, b) => a.timestamp - b.timestamp).map(e => `
            <div class="flex items-center gap-3 py-2">
              <span class="text-xl">${e.icon || '\ud83d\udcdc'}</span>
              <div>
                <div class="font-semibold">${esc(e.event)}</div>
                <span class="chip chip-doc cursor-pointer" onclick="window._openDoc('${esc(e.docId)}')">Bekijk document \u2192</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

// ── Document detail ──
window._openDoc = async (id) => {
  let d;
  try { d = await api.getArchief(id); } catch { return; }
  const state = d.state || 'hidden';
  const isBlurred = !isDM() && state === 'blurred';
  const hoofdstuk = meta?.hoofdstukken?.[d.hoofdstuk];
  const hiddenLinks = archiefData.hiddenLinks?.[id] || {};
  const tekst = archiefData.tekstContent?.[id] || '';

  let body = '';

  // Description
  if (d.desc) {
    body += `<p class="text-sm mb-4 ${isBlurred ? 'blur-sm select-none' : ''}">${esc(d.desc)}</p>`;
  }

  // File (image or PDF) — detect type first, render after modal is open
  const fileUrl = api.fileUrl(d.id);
  body += `<div class="mb-4" id="doc-file-container-${d.id}"></div>`;

  // Parchment text
  if (tekst) {
    body += `<div class="parchment-block mb-4 ${isBlurred ? 'blur-md select-none pointer-events-none' : ''}">${renderParchment(tekst)}</div>`;
  }

  // Connections
  const showNpcs = isDM() ? (d.npcs || []) : (d.npcs || []).filter(n => !(hiddenLinks.npcs || []).includes(n));
  const showLocs = isDM() ? (d.locs || []) : (d.locs || []).filter(n => !(hiddenLinks.locs || []).includes(n));
  const showDocs = isDM() ? (d.docs || []) : (d.docs || []).filter(n => !(hiddenLinks.docs || []).includes(n));

  if (showNpcs.length) {
    body += `
      <div class="mb-3">
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">Personages</div>
        <div class="flex flex-wrap gap-1">
          ${showNpcs.map(n => {
            const hidden = (hiddenLinks.npcs || []).includes(n);
            return `<span class="chip chip-npc">\ud83d\udc64 ${esc(n)}
              ${isDM() ? `<span class="ml-1 cursor-pointer opacity-60 hover:opacity-100" onclick="event.stopPropagation();window._toggleLinkVis('${d.id}','npcs','${esc(n)}')">${hidden ? '\ud83d\udc41' : '\ud83d\udc41\u200d\ud83d\udde8'}</span>` : ''}
            </span>`;
          }).join('')}
        </div>
      </div>
    `;
  }
  if (showLocs.length) {
    body += `
      <div class="mb-3">
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">Locaties</div>
        <div class="flex flex-wrap gap-1">
          ${showLocs.map(n => {
            const hidden = (hiddenLinks.locs || []).includes(n);
            return `<span class="chip chip-loc">\ud83c\udff0 ${esc(n)}
              ${isDM() ? `<span class="ml-1 cursor-pointer opacity-60 hover:opacity-100" onclick="event.stopPropagation();window._toggleLinkVis('${d.id}','locs','${esc(n)}')">${hidden ? '\ud83d\udc41' : '\ud83d\udc41\u200d\ud83d\udde8'}</span>` : ''}
            </span>`;
          }).join('')}
        </div>
      </div>
    `;
  }
  if (showDocs.length) {
    body += `
      <div class="mb-3">
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">Gerelateerde documenten</div>
        <div class="flex flex-wrap gap-1">
          ${showDocs.map(n => `<span class="chip chip-doc">\ud83d\udcdc ${esc(n)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // DM controls
  if (isDM()) {
    body += `
      <div class="dm-only mt-4 pt-4 border-t border-room-border">
        <div class="flex gap-2">
          ${['hidden','blurred','revealed'].map(s => `
            <button class="px-3 py-1 text-sm rounded transition ${state === s ? 'bg-gold-dim text-room-bg font-semibold' : 'bg-room-elevated text-ink-dim hover:text-ink-bright'}"
              onclick="window._setDocState('${d.id}','${s}')">
              ${s === 'hidden' ? '\ud83d\udd12 Verborgen' : s === 'blurred' ? '\ud83d\udc41\u200d\ud83d\udde8 Wazig' : '\u2728 Onthuld'}
            </button>
          `).join('')}
          <button class="px-3 py-1 text-sm rounded bg-gold-dim text-room-bg font-semibold ml-auto"
            onclick="window._openArchiefEditor('${d.id}')">
            \u270f Bewerken
          </button>
        </div>
      </div>
    `;
  }

  const subtitle = [d.type, meta?.hoofdstukken?.[d.hoofdstuk]?.short].filter(Boolean).join(' \u00b7 ');
  openModal(d.name, subtitle, body);

  // Load file into container after modal is in DOM
  const fileContainer = document.getElementById(`doc-file-container-${d.id}`);
  if (fileContainer) {
    try {
      const headRes = await fetch(fileUrl, { method: 'HEAD' });
      if (!headRes.ok) { fileContainer.style.display = 'none'; }
      else {
        const ct = headRes.headers.get('content-type') || '';
        if (isBlurred) {
          if (ct.includes('image')) {
            fileContainer.innerHTML = `<img src="${fileUrl}" class="w-full max-h-80 object-contain rounded blur-xl select-none pointer-events-none">`;
          } else {
            fileContainer.innerHTML = `<div class="rounded bg-room-elevated p-8 text-center select-none"><div class="text-4xl mb-2 opacity-30">\ud83d\udd12</div><div class="text-ink-faint text-sm italic">Document nog niet volledig onthuld</div></div>`;
          }
        } else if (ct.includes('pdf')) {
          await renderPdfViewer(fileContainer, fileUrl);
        } else if (ct.includes('image')) {
          fileContainer.innerHTML = `<img src="${fileUrl}" class="w-full max-h-80 object-contain rounded cursor-pointer" onclick="window.app.openLightbox('${fileUrl}','${esc(d.name)}')">`;
        } else {
          fileContainer.style.display = 'none';
        }
      }
    } catch { fileContainer.style.display = 'none'; }
  }
};

function renderParchment(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '---titel---' && i + 1 < lines.length) {
      html += `<div class="parch-title">${esc(lines[i + 1])}</div>`;
      i += 2; continue;
    }
    if (/^---\s*$/.test(line.trim())) {
      html += '<hr class="parch-rule">';
      i++; continue;
    }
    if (line.trim() === '--handtekening--' && i + 1 < lines.length) {
      html += `<div class="parch-sig">${esc(lines[i + 1])}</div>`;
      i += 2; continue;
    }
    html += `<span>${esc(line)}</span><br>`;
    i++;
  }
  return html;
}

// ── State change ──
window._setDocState = async (id, state) => {
  await api.setArchiefState(id, state);
  renderArchief();
};

// ── Hidden link toggle ──
window._toggleLinkVis = async (docId, field, name) => {
  const links = archiefData.hiddenLinks[docId] || { npcs: [], locs: [], docs: [] };
  if (!links[field]) links[field] = [];
  const idx = links[field].indexOf(name);
  if (idx >= 0) links[field].splice(idx, 1);
  else links[field].push(name);
  archiefData.hiddenLinks[docId] = links;
  await api.saveHiddenLinks(docId, links);
  window._openDoc(docId);
};

// ── Tekst content save ──
let tekstTimer;
window._saveTekst = (id) => {
  clearTimeout(tekstTimer);
  tekstTimer = setTimeout(async () => {
    const ta = document.getElementById(`tekst-editor-${id}`);
    if (!ta) return;
    await api.saveTekst(id, ta.value);
    archiefData.tekstContent[id] = ta.value;
    const ind = document.getElementById(`tekst-save-${id}`);
    if (ind) { ind.textContent = '\u2713 Tekst opgeslagen'; ind.style.opacity = '1'; setTimeout(() => ind.style.opacity = '0', 1200); }
  }, 500);
};

// ── File upload ──
window._uploadDocFile = async (id, file) => {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return alert('Max 10MB');
  await api.uploadFile(id, file);
  window._openDoc(id);
};

// If img fails to load, check if it's a PDF and embed it instead
window._tryPdfEmbed = async (id, imgEl) => {
  const container = document.getElementById(`doc-file-container-${id}`);
  if (!container) return;
  try {
    const res = await fetch(api.fileUrl(id), { method: 'HEAD' });
    if (!res.ok) { container.style.display = 'none'; return; }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('pdf')) {
      renderPdfViewer(container, api.fileUrl(id));
    } else {
      container.style.display = 'none';
    }
  } catch {
    container.style.display = 'none';
  }
};

async function renderPdfViewer(container, url) {
  const pdf = await window.pdfjsLib.getDocument(url).promise;
  container.innerHTML = '<div class="flex flex-col gap-3"></div>';
  const stack = container.firstElementChild;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = container.clientWidth / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.className = 'w-full rounded border border-room-border cursor-pointer hover:border-gold-dim transition';
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    canvas.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL();
      window.app.openLightbox(dataUrl, `Pagina ${i}`);
    });
    stack.appendChild(canvas);
  }
}

// ── Editor ──
export function openArchiefEditor(editId) {
  window._openArchiefEditor(editId);
}

let editorTags = { npcs: [], locs: [], docs: [] };

window._openArchiefEditor = async (editId) => {
  let d = null;
  if (editId) {
    try { d = await api.getArchief(editId); } catch { return; }
  }
  editorTags = { npcs: d?.npcs?.slice() || [], locs: d?.locs?.slice() || [], docs: d?.docs?.slice() || [] };

  let body = `<form id="archief-form" class="space-y-4">
    <div>
      <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Titel</label>
      <input name="name" value="${esc(d?.name || '')}" required
        class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Type</label>
        <select name="type" class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
          ${DOC_TYPES.map(t => `<option value="${t}" ${d?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Categorie</label>
        <select name="cat" class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
          ${DOC_CATS.map(c => `<option value="${c}" ${d?.cat === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Icoon</label>
        <input name="icon" value="${esc(d?.icon || '')}" maxlength="4"
          class="w-20 mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-center text-xl focus:border-gold-dim focus:outline-none">
      </div>
      <div>
        <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Hoofdstuk</label>
        <select name="hoofdstuk" class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
          <option value="">—</option>
          ${Object.entries(meta?.hoofdstukken || {}).map(([k, v]) => `<option value="${k}" ${d?.hoofdstuk === k ? 'selected' : ''}>${v.short}</option>`).join('')}
        </select>
      </div>
    </div>
    <div>
      <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Beschrijving</label>
      <textarea name="desc" rows="4"
        class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-sm focus:border-gold-dim focus:outline-none">${esc(d?.desc || '')}</textarea>
    </div>
    <div>
      <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Bestand</label>
      <div id="editor-file-preview" class="mt-1 mb-2">${editId ? `<img src="${api.fileUrl(editId)}" class="max-h-32 rounded" onerror="this.style.display='none'">` : ''}</div>
      <div class="upload-zone mt-1" onclick="document.getElementById('editor-file-input').click()">
        \ud83d\udcc2 Afbeelding of PDF uploaden (max 10MB)
      </div>
      <input type="file" id="editor-file-input" accept="image/*,.pdf,application/pdf" class="hidden">
      <div id="editor-file-status" class="text-xs text-green-wax opacity-0 transition-opacity mt-1"></div>
    </div>
  `;

  // Tag editors
  const tagMeta = {
    npcs: { icon: '\ud83d\udc64', label: 'Personages', chip: 'chip-npc' },
    locs: { icon: '\ud83c\udff0', label: 'Locaties', chip: 'chip-loc' },
    docs: { icon: '\ud83d\udcdc', label: 'Documenten', chip: 'chip-doc' },
  };
  for (const [field, fm] of Object.entries(tagMeta)) {
    body += `
      <div>
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">${fm.label}</div>
        <div id="atags-${field}" class="flex flex-wrap gap-1 mb-1">
          ${editorTags[field].map(n => `<span class="chip ${fm.chip}">${esc(n)} <span class="cursor-pointer ml-1" onclick="window._removeATag('${field}','${esc(n)}')">\u00d7</span></span>`).join('')}
        </div>
        <div class="flex gap-1">
          <input id="atag-input-${field}" placeholder="${fm.label}..."
            class="flex-1 px-2 py-1 bg-room-bg border border-room-border rounded text-ink-bright text-sm focus:border-gold-dim focus:outline-none"
            onkeydown="if(event.key==='Enter'){event.preventDefault();window._addATag('${field}')}">
          <button type="button" onclick="window._addATag('${field}')"
            class="px-2 py-1 bg-room-elevated border border-room-border rounded text-ink-dim text-sm hover:text-ink-bright">+</button>
        </div>
      </div>
    `;
  }

  // Parchment text editor
  if (editId) {
    const tekst = archiefData.tekstContent?.[editId] || '';
    body += `
      <div>
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">Perkament tekst</div>
        <textarea id="tekst-editor-${editId}" rows="6"
          class="w-full px-3 py-2 bg-parchment-letter text-[#2a2015] font-fell text-sm border border-[#d4c9a8] rounded focus:outline-none"
          placeholder="---titel---\nDocument Titel\n---\nTekst hier...\n--handtekening--\nNaam">${esc(tekst)}</textarea>
      </div>
    `;
  }

  // DM notes
  if (editId) {
    const dmNote = (await api.getNote(editId).catch(() => ({}))).note || '';
    body += `
      <div>
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">DM Notities</div>
        <textarea id="dm-note-editor-${editId}" rows="3"
          class="w-full px-3 py-2 bg-room-bg border border-room-border rounded text-sm text-ink-bright font-crimson focus:border-gold-dim focus:outline-none"
          placeholder="Notities...">${esc(dmNote)}</textarea>
      </div>
    `;
  }

  body += `
    <div class="flex gap-2 pt-2">
      <button type="submit" class="px-4 py-2 bg-gold-dim text-room-bg font-cinzel font-semibold rounded hover:bg-gold transition">\ud83d\udcbe Opslaan</button>
      ${editId ? `<button type="button" onclick="window._deleteDoc('${editId}')" class="px-4 py-2 bg-seal/20 text-seal rounded hover:bg-seal/40 transition">\ud83d\uddd1 Verwijderen</button>` : ''}
      <button type="button" onclick="window.app.closeModal()" class="px-4 py-2 bg-room-elevated text-ink-dim rounded hover:text-ink-bright transition">Annuleren</button>
    </div>
  </form>`;

  openModal(editId ? 'Document bewerken' : 'Nieuw document', '', body);

  // File input preview
  document.getElementById('editor-file-input').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); ev.target.value = ''; return; }
    const preview = document.getElementById('editor-file-preview');
    const status = document.getElementById('editor-file-status');
    if (file.type === 'application/pdf') {
      preview.innerHTML = `<div class="text-sm text-ink-medium p-2 bg-room-elevated rounded">\ud83d\udcc4 ${esc(file.name)} (${(file.size / 1024 / 1024).toFixed(1)} MB)</div>`;
    } else {
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${url}" class="max-h-32 rounded">`;
    }
    status.textContent = 'Wordt geüpload bij opslaan';
    status.style.opacity = '1';
  });

  document.getElementById('archief-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = new FormData(ev.target);
    const payload = {
      name: form.get('name'),
      type: form.get('type'),
      cat: form.get('cat'),
      icon: form.get('icon'),
      hoofdstuk: form.get('hoofdstuk'),
      desc: form.get('desc'),
      npcs: editorTags.npcs,
      locs: editorTags.locs,
      docs: editorTags.docs,
    };
    try {
      let docId = editId;
      if (editId) await api.updateArchief(editId, payload);
      else {
        const created = await api.createArchief(payload);
        docId = created.id;
      }
      // Upload file if one was selected
      const fileInput = document.getElementById('editor-file-input');
      if (fileInput?.files?.[0]) {
        await api.uploadFile(docId, fileInput.files[0]);
      }
      // Save parchment text
      const tekstEl = document.getElementById(`tekst-editor-${docId}`);
      if (tekstEl) {
        await api.saveTekst(docId, tekstEl.value);
        archiefData.tekstContent[docId] = tekstEl.value;
      }
      // Save DM note
      const noteEl = document.getElementById(`dm-note-editor-${docId}`);
      if (noteEl) {
        await api.saveNote(docId, noteEl.value);
      }
      closeModal();
      renderArchief();
    } catch (err) { alert('Fout: ' + err.message); }
  });
};

window._addATag = (field) => {
  const input = document.getElementById(`atag-input-${field}`);
  const val = input.value.trim();
  if (!val || editorTags[field].includes(val)) return;
  editorTags[field].push(val);
  input.value = '';
  refreshATags(field);
};

window._removeATag = (field, name) => {
  editorTags[field] = editorTags[field].filter(n => n !== name);
  refreshATags(field);
};

function refreshATags(field) {
  const fm = { npcs: 'chip-npc', locs: 'chip-loc', docs: 'chip-doc' };
  const container = document.getElementById(`atags-${field}`);
  if (!container) return;
  container.innerHTML = editorTags[field].map(n =>
    `<span class="chip ${fm[field]}">${esc(n)} <span class="cursor-pointer ml-1" onclick="window._removeATag('${field}','${esc(n)}')">\u00d7</span></span>`
  ).join('');
}

window._deleteDoc = async (id) => {
  if (!confirm('Document verwijderen?')) return;
  await api.deleteArchief(id);
  closeModal();
  renderArchief();
};
