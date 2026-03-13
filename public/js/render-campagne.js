import { api } from './api.js';

const ENTITY_TYPES = ['personages', 'locaties', 'organisaties', 'voorwerpen'];
const TYPE_META = {
  personages:    { icon: '\ud83d\udc64', label: 'Personages', color: 'green-wax', chip: 'chip-npc' },
  locaties:      { icon: '\ud83c\udff0', label: 'Locaties', color: 'blue-ink', chip: 'chip-loc' },
  organisaties:  { icon: '\u2694', label: 'Organisaties', color: 'seal', chip: 'chip-org' },
  voorwerpen:    { icon: '\ud83c\udf92', label: 'Voorwerpen', color: 'orange', chip: 'chip-item' },
};

const SCHEMA = {
  personages: {
    subtypes: ['NPC', 'speler', 'antagonist', 'godheid', 'familiar'],
    fields: [
      { key: 'rol', label: 'Rol', type: 'text' },
      { key: 'ras', label: 'Ras', type: 'select', options: ['Mens','Elf','Halfelf','Dwerg','Halfling','Half-ork','Gnoom','Tiefling','Dragonborn','Aarakocra','Dohwar','Harengon','Giff','Tabaxi','Orc','Overig'] },
      { key: 'desc', label: 'Beschrijving', type: 'textarea' },
      { key: 'geheim', label: 'Geheim (DM)', type: 'textarea' },
    ],
  },
  locaties: {
    fields: [
      { key: 'locType', label: 'Type', type: 'select', options: ['Stadswijk','Gebouw','Herberg','Taveerne','Tempel','Winkel','Fort','Schip','Dorp','Stad','Woud','Zee','Overig'] },
      { key: 'wijk', label: 'Wijk', type: 'text' },
      { key: 'eigenaar', label: 'Eigenaar', type: 'text' },
      { key: 'desc', label: 'Beschrijving', type: 'textarea' },
    ],
  },
  organisaties: {
    fields: [
      { key: 'orgType', label: 'Type', type: 'select', options: ['Gilde','Factie','Religieus','Politiek','Crimineel','Militair','Overig'] },
      { key: 'motto', label: 'Motto', type: 'text' },
      { key: 'desc', label: 'Beschrijving', type: 'textarea' },
    ],
  },
  voorwerpen: {
    fields: [
      { key: 'itemType', label: 'Type', type: 'select', options: ['Wapen','Toveritem','Drank','Uitrusting','Scroll','Ring','Amulet','Overig'] },
      { key: 'rariteit', label: 'Rariteit', type: 'select', options: ['Gewoon','Ongewoon','Zeldzaam','Zeer zeldzaam','Legendarisch'] },
      { key: 'prijs', label: 'Prijs', type: 'text' },
      { key: 'desc', label: 'Beschrijving', type: 'textarea' },
    ],
  },
};

const LINK_TYPES = ['personages', 'locaties', 'organisaties', 'voorwerpen', 'archief'];

let activeTab = 'personages';
let entities = {};
let searchQuery = '';
let editorTags = {};

// Lazy proxies — window.app isn't set yet when ES modules evaluate
const $ = (...a) => window.app.$(...a);
const $$ = (...a) => window.app.$$(...a);
const isDM = () => window.app.isDM();
const esc = (...a) => window.app.esc(...a);
const openModal = (...a) => window.app.openModal(...a);
const closeModal = (...a) => window.app.closeModal(...a);
const openLightbox = (...a) => window.app.openLightbox(...a);

export function initCampagne() {
  // Will be rendered on demand
}

export async function renderCampagne() {
  const container = $('#section-campagne');

  // Fetch data for active tab
  try {
    entities[activeTab] = await api.listEntities(activeTab);
  } catch (e) {
    entities[activeTab] = [];
  }

  const list = filterEntities(entities[activeTab] || []);

  container.innerHTML = `
    <!-- Entity type tabs -->
    <div class="flex gap-1 px-6 py-2 border-b border-room-border bg-room-surface/50 flex-wrap">
      ${ENTITY_TYPES.map(t => `
        <button class="entity-tab px-3 py-1.5 text-xs font-cinzel font-semibold rounded-t transition
          ${t === activeTab ? 'text-gold border-b-2 border-gold bg-room-elevated' : 'text-ink-dim hover:text-ink-medium'}"
          data-tab="${t}">
          ${TYPE_META[t].icon} ${TYPE_META[t].label}
          <span class="ml-1 text-[10px] font-mono opacity-60">${(entities[t] || []).length || ''}</span>
        </button>
      `).join('')}
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3 px-6 py-3 bg-room-surface/30">
      <div class="relative flex-1 max-w-md">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">\u2315</span>
        <input type="text" class="search-input w-full pl-9 pr-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-sm font-crimson focus:border-gold-dim focus:outline-none"
          placeholder="Zoek..." value="${esc(searchQuery)}" oninput="window._campagneSearch(this.value)">
      </div>
      <span class="text-ink-faint text-xs font-mono">${list.length} resultaten</span>
    </div>

    <!-- Card grid -->
    <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-6 overflow-y-auto flex-1">
      ${list.length === 0 ? `
        <div class="col-span-full text-center py-16 text-ink-faint">
          <div class="text-4xl mb-3">${TYPE_META[activeTab].icon}</div>
          <div class="font-fell italic">Geen ${TYPE_META[activeTab].label.toLowerCase()} gevonden</div>
        </div>
      ` : list.map(e => renderCard(e)).join('')}
    </div>
  `;

  // Tab click handlers
  container.querySelectorAll('.entity-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      searchQuery = '';
      renderCampagne();
    });
  });

  // Expose search handler
  window._campagneSearch = (q) => {
    searchQuery = q;
    renderCampagne();
  };
}

function filterEntities(list) {
  if (!searchQuery) return list;
  const q = searchQuery.toLowerCase();
  return list.filter(e => {
    const fields = [e.name, e.subtype, ...Object.values(e.data || {})].join(' ').toLowerCase();
    const links = Object.values(e.links || {}).flat().join(' ').toLowerCase();
    return fields.includes(q) || links.includes(q);
  });
}

function renderCard(e) {
  const meta = TYPE_META[activeTab];
  const vis = e._visibility || 'visible';
  const hasImage = true; // We'll check via img onerror
  const metaText = [e.subtype, e.data?.rol, e.data?.locType, e.data?.orgType, e.data?.itemType, e.data?.ras].filter(Boolean).join(' \u00b7 ');
  const desc = e.data?.desc || '';

  // Collect linked chips
  const chips = [];
  if (e.links) {
    (e.links.personages || []).slice(0, 2).forEach(n => chips.push(`<span class="chip chip-npc">\ud83d\udc64 ${esc(n)}</span>`));
    (e.links.locaties || []).slice(0, 2).forEach(n => chips.push(`<span class="chip chip-loc">\ud83c\udff0 ${esc(n)}</span>`));
    (e.links.organisaties || []).slice(0, 1).forEach(n => chips.push(`<span class="chip chip-org">\u2694 ${esc(n)}</span>`));
  }

  return `
    <div class="group bg-room-surface border border-room-border rounded-lg cursor-pointer hover:-translate-y-0.5 hover:shadow-deep hover:border-room-border-light transition relative
      ${vis === 'hidden' && isDM() ? 'opacity-50 border-dashed' : ''}"
      onclick="window._openDetail('${activeTab}','${e.id}')">
      ${isDM() ? `
        <button class="dm-only absolute top-2 right-2 z-10 text-sm w-7 h-7 flex items-center justify-center rounded bg-black/60 hover:bg-black/80"
          onclick="event.stopPropagation();window._toggleVis('${activeTab}','${e.id}')"
          title="${vis === 'visible' ? 'Verbergen' : 'Zichtbaar maken'}">
          ${vis === 'visible' ? '\ud83d\udc41' : '\ud83d\udd12'}
        </button>
      ` : ''}
      <img class="w-full h-32 object-cover rounded-t-lg" src="${api.fileUrl(e.id)}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="h-1 bar-${activeTab} rounded-t-lg" style="display:none"></div>
      <div class="p-4">
        <div class="flex items-start gap-3 mb-2">
          <div class="text-2xl">${e.icon || meta.icon}</div>
          <div class="min-w-0">
            <div class="font-cinzel font-bold text-ink-bright truncate">${esc(e.name)}</div>
            ${metaText ? `<div class="text-xs text-ink-dim italic">${esc(metaText)}</div>` : ''}
          </div>
        </div>
        ${desc ? `<p class="text-sm text-ink-medium line-clamp-3 mb-2">${esc(desc)}</p>` : ''}
        ${chips.length ? `<div class="flex flex-wrap gap-1">${chips.join('')}</div>` : ''}
      </div>
    </div>
  `;
}

// ── Detail view ──
window._openDetail = async (tab, id) => {
  let e;
  try { e = await api.getEntity(tab, id); } catch { return; }
  const meta = TYPE_META[tab];
  const schema = SCHEMA[tab];
  const vis = e._visibility || 'visible';

  let body = '';

  // Image
  body += `
    <div class="mb-4">
      <img src="${api.fileUrl(e.id)}" class="w-full max-h-64 object-contain rounded cursor-pointer"
        onclick="window.app.openLightbox('${api.fileUrl(e.id)}','${esc(e.name)}')"
        onerror="this.parentElement.style.display='none'">
    </div>
  `;

  // Upload zone (DM only)
  if (isDM()) {
    body += `
      <div class="dm-only mb-4">
        <div class="upload-zone" onclick="document.getElementById('file-upload-${e.id}').click()">
          \ud83d\udcf7 Bestand uploaden (afbeelding of PDF, max 10MB)
        </div>
        <input type="file" id="file-upload-${e.id}" accept="image/*,.pdf,application/pdf" class="hidden"
          onchange="window._uploadFile('${tab}','${e.id}',this.files[0])">
      </div>
    `;
  }

  // Stat block for personages (DM only)
  if (isDM() && tab === 'personages' && e.stats) {
    const s = e.stats;
    const mod = (v) => {
      if (!v) return '\u2014';
      const m = Math.floor((parseInt(v) - 10) / 2);
      return m >= 0 ? `+${m}` : `${m}`;
    };
    body += `
      <div class="mb-4 p-4 bg-room-elevated rounded border border-room-border">
        <div class="flex gap-4 mb-3 text-sm">
          ${s.ac ? `<span><span class="text-ink-dim">AC</span> <span class="font-bold">${esc(s.ac)}</span></span>` : ''}
          ${s.hp ? `<span><span class="text-ink-dim">HP</span> <span class="font-bold">${esc(s.hp)}</span></span>` : ''}
          ${s.speed ? `<span><span class="text-ink-dim">Speed</span> <span class="font-bold">${esc(s.speed)}</span></span>` : ''}
        </div>
        <div class="stat-grid">
          ${['str','dex','con','int','wis','cha'].map(a => `
            <div class="stat-box">
              <div class="stat-label">${a.toUpperCase()}</div>
              <div class="stat-val">${s[a] || '\u2014'}</div>
              <div class="stat-mod">${mod(s[a])}</div>
            </div>
          `).join('')}
        </div>
        ${s.extra ? `<div class="mt-3 text-sm text-ink-medium whitespace-pre-wrap">${esc(s.extra)}</div>` : ''}
      </div>
    `;
  }

  // Fields
  for (const field of (schema.fields || [])) {
    const val = e.data?.[field.key];
    if (!val) continue;
    if (field.key === 'geheim') {
      if (!isDM() && !e._secretReveal) continue;
      body += `
        <div class="mb-3 p-3 bg-seal/10 border border-seal/30 rounded">
          <div class="text-xs font-cinzel text-seal font-bold uppercase tracking-wider mb-1">\ud83d\udd12 ${esc(field.label)}</div>
          <div class="text-sm whitespace-pre-wrap">${esc(val)}</div>
        </div>
      `;
      continue;
    }
    body += `
      <div class="mb-3">
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">${esc(field.label)}</div>
        <div class="text-sm whitespace-pre-wrap">${esc(val)}</div>
      </div>
    `;
  }

  // Links
  for (const lt of LINK_TYPES) {
    const names = e.links?.[lt] || [];
    if (names.length === 0) continue;
    const lm = TYPE_META[lt] || { icon: '\ud83d\udcdc', chip: 'chip-doc' };
    body += `
      <div class="mb-3">
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">${lt}</div>
        <div class="flex flex-wrap gap-1">
          ${names.map(n => `<span class="chip ${lm.chip}" onclick="window._navigateTo('${lt}','${esc(n)}')">${lm.icon} ${esc(n)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // DM controls
  if (isDM()) {
    body += `
      <div class="dm-only mt-4 pt-4 border-t border-room-border">
        <div class="flex gap-2 mb-3">
          <button class="px-3 py-1 text-sm rounded ${vis === 'visible' ? 'bg-green-wax text-white' : 'bg-room-elevated text-ink-dim'}"
            onclick="window._toggleVis('${tab}','${e.id}')">
            ${vis === 'visible' ? '\ud83d\udc41 Zichtbaar' : '\ud83d\udd12 Verborgen'}
          </button>
          ${tab === 'personages' ? `
            <button class="px-3 py-1 text-sm rounded ${e._secretReveal ? 'bg-seal text-white' : 'bg-room-elevated text-ink-dim'}"
              onclick="window._toggleSecret('${tab}','${e.id}')">
              ${e._secretReveal ? '\u2728 Geheim onthuld' : '\ud83d\udd12 Geheim verborgen'}
            </button>
          ` : ''}
          <button class="px-3 py-1 text-sm rounded bg-gold-dim text-room-bg font-semibold"
            onclick="window._openEditor('${tab}','${e.id}')">
            \u270f Bewerken
          </button>
        </div>
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">DM Notities</div>
        <textarea id="dm-note-${e.id}" class="w-full min-h-[80px] px-3 py-2 bg-room-bg border border-room-border rounded text-sm text-ink-bright font-crimson focus:border-gold-dim focus:outline-none"
          placeholder="Notities...">${esc(e._dmNote || '')}</textarea>
        <div id="note-save-${e.id}" class="text-xs text-green-wax opacity-0 transition-opacity mt-1"></div>
      </div>
    `;
  }

  openModal(e.name, [e.subtype, meta.label].filter(Boolean).join(' \u2014 '), body);

  // DM note auto-save
  if (isDM()) {
    let noteTimer;
    const ta = document.getElementById(`dm-note-${e.id}`);
    if (ta) {
      ta.addEventListener('input', () => {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(async () => {
          await api.saveNote(e.id, ta.value);
          const ind = document.getElementById(`note-save-${e.id}`);
          if (ind) {
            ind.textContent = '\u2713 Opgeslagen';
            ind.style.opacity = '1';
            setTimeout(() => { ind.style.opacity = '0'; }, 1200);
          }
        }, 400);
      });
    }
  }
};

// ── Visibility / Secret toggles ──
window._toggleVis = async (tab, id) => {
  await api.toggleVisibility(tab, id);
  renderCampagne();
};

window._toggleSecret = async (tab, id) => {
  await api.toggleSecret(tab, id);
  window._openDetail(tab, id);
};

// ── File upload ──
window._uploadFile = async (tab, id, file) => {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return alert('Max 10MB');
  await api.uploadFile(id, file);
  window._openDetail(tab, id);
};

// ── Navigate to linked entity ──
window._navigateTo = (tab, name) => {
  if (!ENTITY_TYPES.includes(tab)) return;
  activeTab = tab;
  searchQuery = name;
  closeModal();
  renderCampagne();
};

// ── Editor ──
export function openEditor(editId) {
  window._openEditor(activeTab, editId);
}

let allNames = {};

window._openEditor = async (tab, editId) => {
  const schema = SCHEMA[tab];
  let e = null;
  if (editId) {
    try { e = await api.getEntity(tab, editId); } catch { return; }
  }
  allNames = await api.allNames();

  editorTags = {};
  for (const lt of LINK_TYPES) {
    editorTags[lt] = e?.links?.[lt]?.slice() || [];
  }

  let body = `<form id="entity-form" class="space-y-4">`;

  // Name
  body += `
    <div>
      <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Naam</label>
      <input name="name" value="${esc(e?.name || '')}" required
        class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
    </div>
  `;

  // Subtype
  if (schema.subtypes) {
    body += `
      <div>
        <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Subtype</label>
        <select name="subtype" class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
          <option value="">—</option>
          ${schema.subtypes.map(s => `<option value="${s}" ${e?.subtype === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    `;
  }

  // Icon
  body += `
    <div>
      <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">Icoon (emoji)</label>
      <input name="icon" value="${esc(e?.icon || '')}" maxlength="4"
        class="w-20 mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-center text-xl focus:border-gold-dim focus:outline-none">
    </div>
  `;

  // Schema fields
  for (const field of schema.fields) {
    const val = e?.data?.[field.key] || '';
    if (field.key === 'geheim' && !isDM()) continue;
    if (field.type === 'textarea') {
      body += `
        <div>
          <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">${esc(field.label)}</label>
          <textarea name="data_${field.key}" rows="4"
            class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright text-sm focus:border-gold-dim focus:outline-none">${esc(val)}</textarea>
        </div>
      `;
    } else if (field.type === 'select') {
      body += `
        <div>
          <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">${esc(field.label)}</label>
          <select name="data_${field.key}" class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
            <option value="">—</option>
            ${field.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      body += `
        <div>
          <label class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider">${esc(field.label)}</label>
          <input name="data_${field.key}" value="${esc(val)}"
            class="w-full mt-1 px-3 py-2 bg-room-bg border border-room-border rounded text-ink-bright focus:border-gold-dim focus:outline-none">
        </div>
      `;
    }
  }

  // Stats (personages)
  if (tab === 'personages') {
    const s = e?.stats || {};
    body += `
      <div class="p-4 bg-room-elevated rounded border border-room-border">
        <div class="text-xs font-cinzel text-gold-dim font-bold uppercase tracking-wider mb-3">Character Sheet</div>
        <div class="grid grid-cols-3 gap-2 mb-3">
          ${['ac','hp','speed'].map(k => `
            <div>
              <label class="text-[10px] font-cinzel text-ink-dim uppercase">${k.toUpperCase()}</label>
              <input name="stat_${k}" value="${esc(s[k] || '')}"
                class="w-full mt-0.5 px-2 py-1 bg-room-bg border border-room-border rounded text-ink-bright text-center text-sm focus:border-gold-dim focus:outline-none">
            </div>
          `).join('')}
        </div>
        <div class="grid grid-cols-3 gap-2 mb-3">
          ${['str','dex','con','int','wis','cha'].map(k => `
            <div>
              <label class="text-[10px] font-cinzel text-ink-dim uppercase">${k.toUpperCase()}</label>
              <input name="stat_${k}" value="${esc(s[k] || '')}"
                class="w-full mt-0.5 px-2 py-1 bg-room-bg border border-room-border rounded text-ink-bright text-center text-sm focus:border-gold-dim focus:outline-none">
            </div>
          `).join('')}
        </div>
        <div>
          <label class="text-[10px] font-cinzel text-ink-dim uppercase">Spreuken / Acties</label>
          <textarea name="stat_extra" rows="3"
            class="w-full mt-0.5 px-2 py-1 bg-room-bg border border-room-border rounded text-ink-bright text-sm focus:border-gold-dim focus:outline-none">${esc(s.extra || '')}</textarea>
        </div>
      </div>
    `;
  }

  // Link editors
  for (const lt of LINK_TYPES) {
    const lm = TYPE_META[lt] || { icon: '\ud83d\udcdc', label: lt, chip: 'chip-doc' };
    body += `
      <div>
        <div class="text-xs font-cinzel text-ink-dim font-bold uppercase tracking-wider mb-1">${lm.label || lt}</div>
        <div id="tags-${lt}" class="flex flex-wrap gap-1 mb-1">
          ${editorTags[lt].map(n => `
            <span class="chip ${lm.chip}">${esc(n)} <span class="cursor-pointer ml-1" onclick="window._removeTag('${lt}','${esc(n)}')">\u00d7</span></span>
          `).join('')}
        </div>
        <div class="flex gap-1">
          <div class="flex-1 autocomplete-wrap">
            <input id="tag-input-${lt}" placeholder="${lm.label || lt}..."
              class="w-full px-2 py-1 bg-room-bg border border-room-border rounded text-ink-bright text-sm focus:border-gold-dim focus:outline-none"
              oninput="window._showSuggestions('${lt}')"
              onkeydown="window._handleTagKey(event,'${lt}')">
            <div id="tag-suggestions-${lt}" class="autocomplete-list"></div>
          </div>
          <button type="button" onclick="window._addTag('${lt}')"
            class="px-2 py-1 bg-room-elevated border border-room-border rounded text-ink-dim text-sm hover:text-ink-bright">+</button>
        </div>
      </div>
    `;
  }

  // Buttons
  body += `
    <div class="flex gap-2 pt-2">
      <button type="submit" class="px-4 py-2 bg-gold-dim text-room-bg font-cinzel font-semibold rounded hover:bg-gold transition">
        \ud83d\udcbe Opslaan
      </button>
      ${editId ? `
        <button type="button" onclick="window._deleteEntity('${tab}','${editId}')"
          class="px-4 py-2 bg-seal/20 text-seal rounded hover:bg-seal/40 transition">
          \ud83d\uddd1 Verwijderen
        </button>
      ` : ''}
      <button type="button" onclick="window.app.closeModal()"
        class="px-4 py-2 bg-room-elevated text-ink-dim rounded hover:text-ink-bright transition">Annuleren</button>
    </div>
  </form>`;

  openModal(editId ? 'Bewerken' : 'Nieuw', TYPE_META[tab].label, body);

  // Form submit handler
  document.getElementById('entity-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = new FormData(ev.target);
    const data = {};
    const stats = {};
    for (const [key, val] of form.entries()) {
      if (key.startsWith('data_')) data[key.slice(5)] = val;
      else if (key.startsWith('stat_')) stats[key.slice(5)] = val;
    }
    const payload = {
      name: form.get('name'),
      subtype: form.get('subtype') || '',
      icon: form.get('icon') || '',
      data,
      links: { ...editorTags },
      stats: tab === 'personages' ? stats : null,
    };
    try {
      if (editId) {
        await api.updateEntity(tab, editId, payload);
      } else {
        await api.createEntity(tab, payload);
      }
      closeModal();
      renderCampagne();
    } catch (err) {
      alert('Fout: ' + err.message);
    }
  });
};

window._addTag = (lt, name) => {
  const input = document.getElementById(`tag-input-${lt}`);
  const val = (name || input.value).trim();
  if (!val || editorTags[lt].includes(val)) return;
  editorTags[lt].push(val);
  input.value = '';
  window._hideSuggestions(lt);
  refreshTags(lt);
};

window._removeTag = (lt, name) => {
  editorTags[lt] = editorTags[lt].filter(n => n !== name);
  refreshTags(lt);
};

window._showSuggestions = (lt) => {
  const input = document.getElementById(`tag-input-${lt}`);
  const list = document.getElementById(`tag-suggestions-${lt}`);
  const q = input.value.trim().toLowerCase();
  const names = (allNames[lt] || []).filter(n =>
    !editorTags[lt].includes(n) && (!q || n.toLowerCase().includes(q))
  );
  if (names.length === 0) { list.classList.remove('open'); return; }
  list.innerHTML = names.map(n =>
    `<div class="autocomplete-item" onmousedown="window._addTag('${lt}','${esc(n)}')">${esc(n)}</div>`
  ).join('');
  list.classList.add('open');
};

window._hideSuggestions = (lt) => {
  const list = document.getElementById(`tag-suggestions-${lt}`);
  if (list) list.classList.remove('open');
};

window._handleTagKey = (ev, lt) => {
  if (ev.key === 'Enter') { ev.preventDefault(); window._addTag(lt); }
  if (ev.key === 'Escape') { window._hideSuggestions(lt); }
};

// Close suggestions on blur (slight delay so mousedown on item fires first)
document.addEventListener('focusout', (ev) => {
  if (ev.target.id?.startsWith('tag-input-')) {
    const lt = ev.target.id.replace('tag-input-', '');
    setTimeout(() => window._hideSuggestions(lt), 150);
  }
});

function refreshTags(lt) {
  const lm = TYPE_META[lt] || { icon: '\ud83d\udcdc', chip: 'chip-doc' };
  const container = document.getElementById(`tags-${lt}`);
  if (!container) return;
  container.innerHTML = editorTags[lt].map(n =>
    `<span class="chip ${lm.chip}">${esc(n)} <span class="cursor-pointer ml-1" onclick="window._removeTag('${lt}','${esc(n)}')">\u00d7</span></span>`
  ).join('');
}

// ── Delete ──
window._deleteEntity = async (tab, id) => {
  if (!confirm('Weet je zeker dat je dit wilt verwijderen?')) return;
  await api.deleteEntity(tab, id);
  closeModal();
  renderCampagne();
};
