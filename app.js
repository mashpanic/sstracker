// app.js — tracker logic + UI config (bucket ③).
//
// Owns all behavior and the tracker's own UI configuration (run-map node
// options, turn order, encounter display names). Depends on game data loaded
// by gamedata.js and gamefacts.js, which MUST be included before this file:
//
//   <script src="gamedata.js"></script>
//   <script src="gamefacts.js"></script>
//   <script src="app.js"></script>
//
// All three are classic scripts (not modules), so the consts those files
// declare are visible here by their bare names.

// ---- Central Node selector options (edit here) ----
// The 16 possible central node picks, shared by every central-node dropdown.
// Each select also gets a "?" option for "not yet chosen", added automatically.
const CENTRAL_NODE_OPTIONS = [
    'Arms',    'Arms+',
    'Boons',   'Boons+',
    'Forge',   'Forge+',
    'Hoard',   'Hoard+',
    'Magic',   'Magic+',
    'Remains', 'Remains+',
    'Steel',   'Steel+',
    'Trinkets','Trinkets+'
];

function populateCentralNodeSelects() {
    const optionsHtml = '<option value="?">?</option>' +
        CENTRAL_NODE_OPTIONS.map(name => `<option value="${name}">${name}</option>`).join('');

    document.querySelectorAll('.central-node-select').forEach(sel => {
        sel.innerHTML = optionsHtml;
    });
}

// ---- Left/Right Track selector options (edit here) ----
// The 9 possible track node picks, shared by every left/right track dropdown.
// Each select also gets a "?" option for "not yet chosen", added automatically.
const TRACK_NODE_OPTIONS = [
    'Armory',
    'Boons',
    'Celestial',
    'Hoard',
    'Remains',
    'UnitAllied',
    'UnitPrimary',
    'Vortex',
    'Well'
];

function populateTrackNodeSelects() {
    const optionsHtml = '<option value="?">?</option>' +
        TRACK_NODE_OPTIONS.map(name => `<option value="${name}">${name}</option>`).join('');

    document.querySelectorAll('.track-node-select').forEach(sel => {
        sel.innerHTML = optionsHtml;
    });
}

// Variant options live in gamefacts.js (VARIANT_OPTIONS).
function populateVariantSelects() {
    document.querySelectorAll('.variant-select').forEach(sel => {
        const names = VARIANT_OPTIONS[sel.id] || [];
        sel.innerHTML = '<option value="">-- Select Variant --</option>' +
            names.map(name => `<option value="${name}">${name}</option>`).join('');
    });
}

// Wave set options live in gamefacts.js (WAVE_SET_OPTIONS).
function populateWaveSetSelects() {
    document.querySelectorAll('.wave-set-select').forEach(sel => {
        const region = sel.id.replace(/-wave-set$/, '');
        const names = WAVE_SET_OPTIONS[region] || [];
        sel.innerHTML = '<option value="">-- Select Wave Set --</option>' +
            names.map(name => `<option value="${name}">${name}</option>`).join('');
    });
}

// ---- Path/Track selector options (edit here) ----
// The two choices for which side of the train track was taken.
// Each select also gets a "?" option for "not yet chosen", added automatically.
const PATH_TRACK_OPTIONS = [
    ['L', 'Left'],
    ['R', 'Right']
];

function populatePathTrackSelects() {
    const optionsHtml = '<option value="?">?</option>' +
        PATH_TRACK_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

    document.querySelectorAll('.path-track-select').forEach(sel => {
        sel.innerHTML = optionsHtml;
    });
}

// ---- Order selector options (edit here) ----
// The possible turn-order picks (1st through 4th) shared by every region's order dropdown.
// Each select also gets a "?" option for "not yet chosen", added automatically.
const ORDER_OPTIONS = [1, 2, 3, 4];

function populateOrderSelects() {
    const optionsHtml = '<option value="?">?</option>' +
        ORDER_OPTIONS.map(n => `<option value="${n}">${n}</option>`).join('');

    document.querySelectorAll('.order-select').forEach(sel => {
        sel.innerHTML = optionsHtml;
    });
}

// ---- Encounter names & row info (edit here) ----
// Single source of truth for each encounter's display name. The row label
// in the table (the <td class="encounter-label"> cell) and the info box's
// default "[name] information" text are both generated from "name" below,
// so it only has to be typed once. "groupClass" applies the colored left
// border that visually pairs Battle/Boss rows for the same region. Each
// encounter's variant <select> id is always "<key>-variant", so it's
// derived where needed rather than stored here.
const encounterInfo = {
    'astrael':          { name: 'Astrael',          groupClass: ''               },
    'maera-battle':     { name: 'Maera Battle',     groupClass: 'group-maera'    },
    'maera-boss':       { name: 'Maera Boss',       groupClass: 'group-maera'    },
    'thaddeus-battle':  { name: 'Thaddeus Battle',  groupClass: 'group-thaddeus' },
    'thaddeus-boss':    { name: 'Thaddeus Boss',    groupClass: 'group-thaddeus' },
    'tivi-battle':      { name: 'Tivi Battle',      groupClass: 'group-tivi'     },
    'tivi-boss':        { name: 'Tivi Boss',        groupClass: 'group-tivi'     },
    'lylith-battle':    { name: 'Lylith Battle',    groupClass: 'group-lylith'   },
    'lylith-boss':      { name: 'Lylith Boss',      groupClass: 'group-lylith'   },
    'lifemother':       { name: 'Lifemother',       groupClass: ''               }
};

// Fills in each row's name label (and group-color border) from encounterInfo,
// so the display name only needs to be defined in one place.
function populateEncounterLabels() {
    document.querySelectorAll('.encounter-label').forEach(td => {
        const info = encounterInfo[td.dataset.key];
        if (!info) return;
        td.innerHTML = `<strong>${info.name}</strong>`;
        if (info.groupClass) td.classList.add(info.groupClass);
    });
}

function updateNodeDisplay(selectEl) {
    const slotEl = selectEl.parentElement;
    const labelEl = slotEl.querySelector('.label');

    // Central Node, Path, Left/Right Track, and Variant selectors all display
    // their full option name (e.g. "Trinkets+", "Left Track", "Armory",
    // "Sibling Hierarchy") rather than a short code, truncated with an
    // ellipsis by the .full-name-slot styling if it's too long to fit.
    const showsFullName = selectEl.classList.contains('central-node-select')
        || selectEl.classList.contains('track-node-select')
        || selectEl.classList.contains('variant-select')
        || selectEl.classList.contains('wave-set-select')
        || selectEl.id.endsWith('-path-track');

    const isUnselected = selectEl.value === '?' || selectEl.value === '';

    if (showsFullName) {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const fullText = selectedOption ? selectedOption.textContent : selectEl.value;
        // Variant placeholder text ("-- Select Variant --") is too long for the
        // box, so show a plain "?" until a real variant is chosen.
        labelEl.textContent = isUnselected ? '?' : fullText;
        slotEl.title = isUnselected ? '' : fullText; // tooltip shows the untruncated name
    } else {
        labelEl.textContent = selectEl.value;
    }

    if (!isUnselected) {
        slotEl.classList.add('selected');
    } else {
        slotEl.classList.remove('selected');
    }
}

// Returns the info-box HTML for an encounter. variantDescriptions entries
// may contain HTML (e.g. <br>, <strong>) since the result is assigned via
// innerHTML; the values are all author-controlled, so this is safe.
// Resolve a string | [O1,O2,O3,O4] value to one string using the row's order
// selector. Fixed (string) values ignore order; arrays index by order-1.
// Used for BOSS_STATS, WAVE_SET_DESCRIPTIONS and BOSS_WAVE_DESCRIPTIONS.
function pickByOrder(entry, region) {
    if (entry == null) return null;
    if (typeof entry === 'string') return entry;
    const orderEl = document.getElementById(`${region}-order`);
    const order = orderEl ? parseInt(orderEl.value, 10) : NaN;
    return !Number.isNaN(order) ? entry[order - 1] : null;
}

// Regex matching any known enemy display name, longest-first so multi-word
// names ("Mother's Glutmass") win over a contained shorter one ("Glutmass").
// Static — ENEMY_STATS is fixed at load.
const ENEMY_NAME_RE = new RegExp(
    Object.keys(ENEMY_STATS)
        .sort((a, b) => b.length - a.length)
        .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
    'g'
);

// The visit order (1-4) used to look up an enemy's observed stats for a row.
// astrael is always first (O1); lifemother always last (O4). Mid-run regions
// use their Order dropdown; null until one is picked.
function encounterOrder(key) {
    if (key === 'astrael') return 1;
    if (key === 'lifemother') return 4;
    const el = document.getElementById(`${key.split('-')[0]}-order`);
    const n = el ? parseInt(el.value, 10) : NaN;
    return Number.isNaN(n) ? null : n;
}

// Render one combatant as: abbreviated name + inline "(atk/hp)" (muted).
// Missing/unparseable stat → "(?)" in the amber unrecorded style. Used for both
// trash enemies and the boss (no special emphasis on the boss — it reads like
// any other unit). `noteKey` (defaults to `name`) keys ENEMY_NOTES for the
// ability-text popover; a boss passes its variant key since the wave-list name
// (e.g. "Maera the Dutiful") differs from the note key (e.g. "Sibling Hierarchy").
// When a note exists the span gets data-note-key/data-full-name (read by the
// popover handlers) and drops the native title to avoid a double tooltip; with
// no note, the full name stays on the native title as before.
function enemySpan(name, statStr, noteKey) {
    const m = statStr && statStr.match(/(\d+)\D+(\d+)/);
    const num = m ? `(${m[1]}/${m[2]})` : '(?)';
    const cls = m ? 'enemy-stat' : 'enemy-stat unrecorded';
    const disp = name.replace("Mother's ", "M. ");
    const key = noteKey || name;
    const hasNote = typeof ENEMY_NOTES !== 'undefined' && ENEMY_NOTES[key];
    const attrs = hasNote
        ? ` data-note-key="${escapeAttr(key)}" data-full-name="${escapeAttr(name)}"`
        : ` title="${escapeAttr(name)}"`;
    return `<span class="${cls}"${attrs}>${disp}<span class="es-num">&nbsp;${num}</span></span>`;
}

// Minimal HTML-attribute escaper for names/keys placed in double-quoted attrs.
function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Wrap combatant names in a wave-list string with inline ATK/HP so wave
// strength reads at a glance. Trash enemies use ENEMY_STATS at the given order.
// The boss appears under its in-game name (not in ENEMY_STATS), so pass it
// explicitly (bossName + its BOSS_STATS value) to get the same inline treatment.
function wrapEnemyStats(html, order, bossName, bossStat, bossNoteKey) {
    let out = html.replace(ENEMY_NAME_RE, name => {
        const v = order && ENEMY_STATS[name] ? ENEMY_STATS[name][order - 1] : null;
        return enemySpan(name, v);
    });
    if (bossName && out.includes(bossName)) {
        // The boss's note is keyed by its variant (bossNoteKey), not its
        // wave-list display name — pass it so the popover resolves.
        out = out.split(bossName).join(enemySpan(bossName, bossStat, bossNoteKey));
    }
    return out;
}

// In-game display name of each region's boss as it appears in BossBattle wave
// lists (differs from the variant names — Stern Sister, etc.).
const REGION_BOSS_DISPLAY = {
    maera: 'Maera the Dutiful',
    thaddeus: 'Thaddeus the Indulgent',
    tivi: 'Tivi the Unruly',
    lylith: 'Lylith the Spurned',
};

// A battle row's wave-set description bakes in whichever minor boss the
// extractor found in that scenario, but the minor boss is chosen independently
// of the wave set (verified: any R-region boss can front any of its wave sets;
// and Quoto/Ajax reuse Elebor's/Qel's sets). So replace the baked region
// candidate in the wave string with the actually-selected battle variant.
function swapBattleBoss(waves, region, selected) {
    if (!selected) return waves;
    (VARIANT_OPTIONS[`${region}-battle-variant`] || []).forEach(name => {
        if (name !== selected) waves = waves.split(name).join(selected);
    });
    return waves;
}

function getDisplayText(key) {
    const info = encounterInfo[key];
    const variantEl = document.getElementById(`${key}-variant`);
    if (variantEl && variantEl.value) {
        const variant = variantEl.value;
        const region = key.includes('-') ? key.split('-')[0] : key;
        const order = encounterOrder(key);
        // Boss ATK/HP no longer leads the box — it's shown inline in the wave,
        // like every other unit. BOSS_STATS is a fixed string (Astrael/
        // Lifemother) or an [O1..O4] array (the four regions).
        const bossStat = pickByOrder(BOSS_STATS[variant], region);
        // Lead with the boss name given the same inline-stat + note-popover
        // treatment as the final-wave boss. The variant IS the boss name for
        // region/minor bosses and Lifemother; Astrael's variant is a wave-set/
        // featured-enemy label, so show (and key the note on) Astrael's own name.
        const leadName = key === 'astrael' ? 'Astrael the First Reborn' : variant;
        const bossLabel = enemySpan(leadName, bossStat, leadName);
        let text = variantDescriptions[variant]
            ? bossLabel + ': ' + variantDescriptions[variant]
            : bossLabel + ' information';

        // Mid-run regions need an Order before wave/stat lines can resolve
        // (encounterOrder is null until the dropdown is set; Astrael/Lifemother
        // are fixed and never null). Lead with a prompt so the empty wave list
        // is explained.
        if (order === null) {
            text = '<span class="order-hint">Select an Order for complete information</span><br>' + text;
        }

        // Battle rows: the minor boss is the selected variant (swapBattleBoss
        // puts it in the wave string); it gets inline stats like any enemy.
        if (key.endsWith('-battle')) {
            const waveEl = document.getElementById(`${region}-wave-set`);
            if (waveEl && waveEl.value) {
                const waves = pickByOrder(WAVE_SET_DESCRIPTIONS[waveEl.value], region);
                if (waves) text += '<br>' + wrapEnemyStats(swapBattleBoss(waves, region, variant), order, variant, bossStat, variant);
            }
        }

        // (Defeat mutator is shown via the mutator box hover on each row, not here.)

        // Boss/standalone rows: the boss appears under its in-game name —
        // region boss (REGION_BOSS_DISPLAY), Astrael, or the Lifemother variant.
        if (key.endsWith('-boss') || !key.includes('-')) {
            const bossWaves = pickByOrder(BOSS_WAVE_DESCRIPTIONS[variant], region);
            if (bossWaves) {
                const bossName = key.endsWith('-boss') ? REGION_BOSS_DISPLAY[region]
                    : (key === 'astrael' ? 'Astrael the First Reborn' : variant);
                // Note key: region bosses fight under their region display name
                // but their note is keyed by variant (Sibling Hierarchy, …);
                // Astrael/Lifemother fight under a name that IS the note key.
                const bossNoteKey = key.endsWith('-boss') ? variant : bossName;
                text += '<br>' + wrapEnemyStats(bossWaves, order, bossName, bossStat, bossNoteKey);
            }
        }

        return text;
    }
    return info.name + ' information';
}

function selectEncounter(row, key) {
    document.querySelectorAll('.selected-row').forEach(r => {
        r.classList.remove('selected-row');
    });

    row.classList.add('selected-row');
    row.dataset.encounterKey = key;
    document.getElementById('encounter-info').innerHTML = getDisplayText(key);
    saveState();
}

function refreshMutatorBox(variantSelectEl) {
    const row = variantSelectEl.closest('tr');
    if (!row) return;
    const box = row.querySelector('.mutator-box');
    if (!box) return;
    const mutator = MUTATORS[variantSelectEl.value];
    if (mutator) {
        // Box shows the terse effect gist (wraps to 2 lines if long); the
        // flavor name + full effect appear in the red hover popover (keyed by
        // the variant value via data-curse-key — see setupPopovers).
        box.textContent = mutator.short || mutator.name;
        box.dataset.curseKey = variantSelectEl.value;
        box.classList.add('has-mutator');
    } else {
        box.textContent = '—';
        delete box.dataset.curseKey;
        box.classList.remove('has-mutator');
    }
}

function handleVariantChange(selectEl) {
    const row = selectEl.closest('tr');
    if (!row) return;

    refreshMutatorBox(selectEl);

    // Auto-select the wave set when the region offers only one (battle rows
    // only — e.g. Thaddeus/Lylith each have a single wave set shared by both
    // their minor bosses). Saves the redundant second pick. Done before the
    // info-box refresh below so it reflects the wave set immediately.
    if (selectEl.value && selectEl.id.endsWith('-battle-variant')) {
        const region = selectEl.id.split('-')[0];
        const opts = WAVE_SET_OPTIONS[region] || [];
        if (opts.length === 1) {
            const waveSel = document.getElementById(`${region}-wave-set`);
            if (waveSel && waveSel.value !== opts[0]) {
                waveSel.value = opts[0];
                updateNodeDisplay(waveSel);
            }
        }
    }

    // Picking a variant should select its row automatically (as if the
    // user had clicked it), so the info box updates without an extra click.
    if (!row.classList.contains('selected-row')) {
        const labelCell = row.querySelector('.encounter-label');
        const key = labelCell ? labelCell.dataset.key : row.dataset.encounterKey;
        if (key) {
            selectEncounter(row, key);
        }
        return;
    }

    if (row.dataset.encounterKey) {
        document.getElementById('encounter-info').innerHTML = getDisplayText(row.dataset.encounterKey);
    }
}

// Simple mode hides the last 3 columns (Left Track, Right Track, Path)
// by toggling a class on the table.
function toggleSimpleMode(checkbox) {
    document.getElementById('encounter-table').classList.toggle('simple-mode', checkbox.checked);
    saveState();
}

// ---- Persistence (localStorage) ----
// The whole grid state — every dropdown value, the simple-mode toggle,
// and the currently selected row — is saved on every change and restored
// on load, so a run survives refreshes and reopening the page.
const STORAGE_KEY = 'mt2-soul-savior-state-v1';
const DEFAULT_INFO = 'Select a battle or boss to see information.';

function saveState() {
    const selects = {};
    document.querySelectorAll('#encounter-table select').forEach(sel => {
        selects[sel.id] = sel.value;
    });
    const selectedRow = document.querySelector('.selected-row');
    const state = {
        selects,
        simpleMode: document.querySelector('#simple-mode-toggle input').checked,
        selectedKey: selectedRow ? (selectedRow.dataset.encounterKey || null) : null
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable (private mode, etc.) — ignore */ }
}

function restoreState() {
    let state;
    try {
        state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) { return; }
    if (!state) return;

    if (state.selects) {
        Object.entries(state.selects).forEach(([id, value]) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.value = value;
            updateNodeDisplay(sel); // refresh the slot label / selected styling
        });
    }
    if (typeof state.simpleMode === 'boolean') {
        const cb = document.querySelector('#simple-mode-toggle input');
        cb.checked = state.simpleMode;
        toggleSimpleMode(cb);
    }
    if (state.selectedKey) {
        const label = document.querySelector(`.encounter-label[data-key="${state.selectedKey}"]`);
        if (label) selectEncounter(label.closest('tr'), state.selectedKey);
    }
}

function resetGrid() {
    if (!confirm('Reset the whole grid? This clears every selection for the current run.')) return;
    document.querySelectorAll('#encounter-table select').forEach(sel => {
        sel.selectedIndex = 0; // first option is the "?" / "-- Select Variant --" placeholder
        updateNodeDisplay(sel);
    });
    document.querySelectorAll('.selected-row').forEach(r => {
        r.classList.remove('selected-row');
        delete r.dataset.encounterKey;
    });
    // Clear the mutator indicator boxes too — resetting the variant selects
    // above doesn't fire 'change', so the boxes keep their last text otherwise.
    document.querySelectorAll('.variant-select').forEach(sel => refreshMutatorBox(sel));
    document.getElementById('encounter-info').innerHTML = DEFAULT_INFO;
    refreshOrderOptions(); // re-enable every order number
    reorderGroups();       // restore the default group order
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
}

// ---- Turn order: disable taken numbers & re-sort the four groups ----
// Each region's Order dropdown picks its turn (1-4). A number picked by
// one region is disabled in the others so it can't be chosen twice, and
// the four Battle/Boss groups are re-sorted in the table to match. Regions
// with no number yet keep their default relative order, after the numbered
// ones. The astrael and lifemother rows never move.
function refreshOrderOptions() {
    const taken = new Set();
    REGION_KEYS.forEach(region => {
        const v = document.getElementById(`${region}-order`).value;
        if (v !== '?') taken.add(v);
    });
    REGION_KEYS.forEach(region => {
        const sel = document.getElementById(`${region}-order`);
        Array.from(sel.options).forEach(opt => {
            if (opt.value === '?') return;
            // Grey out a number taken by some OTHER region; keep this
            // select's own current pick selectable.
            opt.disabled = taken.has(opt.value) && opt.value !== sel.value;
        });
    });
}

function reorderGroups() {
    const tbody = document.getElementById('encounter-tbody');
    const anchor = document.querySelector('.encounter-label[data-key="lifemother"]').closest('tr');
    const rowOf = key => document.querySelector(`.encounter-label[data-key="${key}"]`).closest('tr');

    const sorted = REGION_KEYS.map((region, idx) => {
        const n = parseInt(document.getElementById(`${region}-order`).value, 10);
        return { region, idx, order: Number.isNaN(n) ? Infinity : n };
    }).sort((a, b) => (a.order - b.order) || (a.idx - b.idx));

    // Re-insert each group's Battle then Boss row just above lifemother,
    // in sorted order, so the groups end up ordered between astrael and
    // lifemother without disturbing those two fixed rows.
    sorted.forEach(({ region }) => {
        tbody.insertBefore(rowOf(`${region}-battle`), anchor);
        tbody.insertBefore(rowOf(`${region}-boss`), anchor);
    });
}

// ---- Table row generation (edit layout here) ----
// The encounter table body is generated from this layout rather than
// hand-written, so each row type is defined once. 'astrael' and
// 'lifemother' are standalone intro/final rows; each of the four mid-run
// regions renders a paired Battle + Boss row that share a single Order
// cell (rowspan=2). All element ids match the keys used by encounterInfo,
// VARIANT_OPTIONS, and the populate* helpers, so those stay untouched.
const TOP_ROWS = ['astrael'];
const REGION_KEYS = ['maera', 'thaddeus', 'tivi', 'lylith'];
const BOTTOM_ROWS = ['lifemother'];

// The dropdowns are visually represented by styled boxes with the actual
// <select> sitting invisibly on top, so each one carries an aria-label to
// stay usable for screen readers. labelFor turns a key like "maera-boss"
// into a readable "Maera Boss".
const labelFor = key => key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function slot(id, selectClass, { full = true, variant = false, variantHandler = false, aria = '' } = {}) {
    const classes = ['node-slot'];
    if (full) classes.push('full-name-slot');
    if (variant) classes.push('variant-slot');
    const onchange = variantHandler
        ? 'updateNodeDisplay(this); handleVariantChange(this)'
        : 'updateNodeDisplay(this)';
    const ariaAttr = aria ? ` aria-label="${aria}"` : '';
    return `<div class="${classes.join(' ')}"><span class="label">?</span>`
         + `<select id="${id}" class="${selectClass}"${ariaAttr} onchange="${onchange}"></select></div>`;
}

const container = (...slots) => `<div class="node-container">${slots.join('')}</div>`;
const cell = inner => `<td>${inner}</td>`;
const variantCell = id => {
    const key = id.replace(/-variant$/, '');
    return cell(container(slot(id, 'variant-select', { variant: true, variantHandler: true, aria: `${labelFor(key)} variant` })));
};

// Boss rows get a mutator indicator box alongside the variant selector.
const bossVariantCell = (bossKey) => {
    return cell(container(
        slot(`${bossKey}-variant`, 'variant-select', { variant: true, variantHandler: true, aria: `${labelFor(bossKey)} variant` }),
        `<div class="mutator-box" id="${bossKey}-mutator-box">—</div>`
    ));
};

// Battle rows get a second slot for the wave set alongside the boss variant.
const battleVariantCell = (region, battleKey) => {
    return cell(container(
        slot(`${battleKey}-variant`, 'variant-select', { variant: true, variantHandler: true, aria: `${labelFor(battleKey)} boss` }),
        slot(`${region}-wave-set`, 'wave-set-select', { variant: true, aria: `${labelFor(region)} wave set` })
    ));
};
const trackCell = (prefix, side) => cell(container(
    slot(`${prefix}-${side}-1`, 'track-node-select', { aria: `${labelFor(prefix)} ${side} track 1` }),
    slot(`${prefix}-${side}-2`, 'track-node-select', { aria: `${labelFor(prefix)} ${side} track 2` })
));
const pathCell = prefix => cell(container(slot(`${prefix}-path-track`, 'path-track-select', { aria: `${labelFor(prefix)} path` })));

// Standalone row (astrael / lifemother): no Order cell, variant only,
// remaining columns disabled.
function singleRowHtml(key) {
    return `<tr class="selectable-row" onclick="selectEncounter(this, '${key}')">`
         + `<td class="disabled-cell order-cell">—</td>`
         + `<td class="encounter-label" data-key="${key}"></td>`
         + variantCell(`${key}-variant`)
         + `<td class="disabled-cell">—</td>`.repeat(4)
         + `</tr>`;
}

// Region pair: Battle row owns the rowspan'd Order cell and one central
// node; Boss row has two central nodes and inherits the Order cell.
function regionRowsHtml(region) {
    const battleKey = `${region}-battle`;
    const bossKey = `${region}-boss`;

    const battle = `<tr class="selectable-row" onclick="selectEncounter(this, '${battleKey}')">`
        + `<td class="order-cell" rowspan="2" onclick="event.stopPropagation()">`
        + container(slot(`${region}-order`, 'order-select', { full: false, aria: `${labelFor(region)} turn order` }))
        + `</td>`
        + `<td class="encounter-label" data-key="${battleKey}"></td>`
        + battleVariantCell(region, battleKey)
        + cell(container(slot(`${region}-n1`, 'central-node-select', { aria: `${labelFor(battleKey)} central node` })))
        + trackCell(battleKey, 'left')
        + trackCell(battleKey, 'right')
        + pathCell(battleKey)
        + `</tr>`;

    const boss = `<tr class="selectable-row" onclick="selectEncounter(this, '${bossKey}')">`
        + `<td class="encounter-label" data-key="${bossKey}"></td>`
        + bossVariantCell(bossKey)
        + cell(container(
            slot(`${region}-n2`, 'central-node-select', { aria: `${labelFor(bossKey)} central node 1` }),
            slot(`${region}-n3`, 'central-node-select', { aria: `${labelFor(bossKey)} central node 2` })
          ))
        + trackCell(bossKey, 'left')
        + trackCell(bossKey, 'right')
        + pathCell(bossKey)
        + `</tr>`;

    return battle + boss;
}

function renderEncounterTable() {
    const rows = [
        ...TOP_ROWS.map(singleRowHtml),
        ...REGION_KEYS.map(regionRowsHtml),
        ...BOTTOM_ROWS.map(singleRowHtml)
    ];
    document.getElementById('encounter-tbody').innerHTML = rows.join('');
}

renderEncounterTable();
populateEncounterLabels();
populateCentralNodeSelects();
populateTrackNodeSelects();
populateVariantSelects();
populateWaveSetSelects();
populatePathTrackSelects();
populateOrderSelects();

// Persist any dropdown change (selects fire 'change' which bubbles to the
// table); row clicks and the simple-mode toggle call saveState directly.
// An Order pick additionally re-syncs disabled numbers and re-sorts groups.
document.getElementById('encounter-table').addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('order-select')) {
        refreshOrderOptions();
        reorderGroups();
        // Refresh info box so order-scaled stats update immediately.
        const selectedRow = document.querySelector('.selected-row');
        if (selectedRow && selectedRow.dataset.encounterKey) {
            document.getElementById('encounter-info').innerHTML = getDisplayText(selectedRow.dataset.encounterKey);
        }
    }
    // Refresh info box when wave set changes so description appends immediately.
    if (e.target && e.target.classList.contains('wave-set-select')) {
        const selectedRow = document.querySelector('.selected-row');
        if (selectedRow && selectedRow.dataset.encounterKey) {
            document.getElementById('encounter-info').innerHTML = getDisplayText(selectedRow.dataset.encounterKey);
        }
    }
    saveState();
});

// Restore the saved run last, after every select has its options, then
// apply the saved turn order (disabled numbers + group sort).
restoreState();
refreshOrderOptions();
reorderGroups();

// Refresh mutator boxes after state is restored.
document.querySelectorAll('.variant-select').forEach(sel => refreshMutatorBox(sel));

// ----- Floating popover (hover) -----
// One shared element serves two uses: enemy/boss ability notes in the info-box
// wave lists (green) and boss defeat-mutator "curses" on the encounter rows
// (red, via .note-popover--curse). Both show instantly on hover (no native-
// title delay) and hide on mouse-out; an info-box rebuild also clears it.
(function setupPopovers() {
    const infoBox = document.getElementById('encounter-info');
    const table = document.getElementById('encounter-table');
    const pop = document.createElement('div');
    pop.className = 'note-popover';
    pop.style.display = 'none';
    document.body.appendChild(pop);

    function showAt(el, html, curse) {
        pop.className = 'note-popover' + (curse ? ' note-popover--curse' : '');
        pop.innerHTML = html;
        pop.style.display = 'block';
        // Position under the target, clamped to the viewport horizontally.
        const r = el.getBoundingClientRect();
        const maxLeft = window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8;
        const left = Math.min(window.scrollX + r.left, Math.max(window.scrollX + 8, maxLeft));
        pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
        pop.style.left = left + 'px';
    }
    function hide() { pop.style.display = 'none'; }

    // Enemy/boss ability notes (green). Note text may contain <br> → innerHTML.
    if (infoBox) {
        infoBox.addEventListener('mouseover', e => {
            const span = e.target.closest('.enemy-stat[data-note-key]');
            if (!span) return;
            const key = span.dataset.noteKey;
            const note = key && typeof ENEMY_NOTES !== 'undefined' && ENEMY_NOTES[key];
            if (note) showAt(span, `<strong>${escapeAttr(span.dataset.fullName || key)}</strong><br>${note}`, false);
        });
        infoBox.addEventListener('mouseout', e => {
            const span = e.target.closest('.enemy-stat[data-note-key]');
            if (span && !span.contains(e.relatedTarget)) hide();
        });
        new MutationObserver(hide).observe(infoBox, { childList: true });
    }

    // Boss defeat-mutator "curse" boxes (red). Flavor name + full effect.
    if (table) {
        table.addEventListener('mouseover', e => {
            const box = e.target.closest('.mutator-box[data-curse-key]');
            if (!box) return;
            const m = typeof MUTATORS !== 'undefined' && MUTATORS[box.dataset.curseKey];
            if (m) showAt(box, `<strong>${escapeAttr(m.name)}</strong><br>${escapeAttr(m.effect)}`, true);
        });
        table.addEventListener('mouseout', e => {
            const box = e.target.closest('.mutator-box[data-curse-key]');
            if (box && !box.contains(e.relatedTarget)) hide();
        });
    }
})();
