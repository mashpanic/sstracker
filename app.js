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

    // Central Node, Variant, and Wave Set selectors all display their full
    // option name (e.g. "Trinkets+", "Sibling Hierarchy") rather than a short
    // code, truncated with an ellipsis by the .full-name-slot styling if it's
    // too long to fit.
    const showsFullName = selectEl.classList.contains('central-node-select')
        || selectEl.classList.contains('variant-select')
        || selectEl.classList.contains('wave-set-select');

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

// Returns the info-box HTML for an encounter. The result is assigned via
// innerHTML; every interpolated value is author-controlled data, so this is safe.
// ---- Temporary ("provisional") order ----
// While contemplating which region to enter next, selecting a mid-region row
// whose turn isn't assigned yet auto-previews it at the next unused order (the
// old "set the Order to the next number, look, set it back to ?" dance). It's a
// VIRTUAL overlay: the underlying `${region}-order` select value stays "?", so
// it's never persisted (saveState), never reserves the number away from other
// regions (refreshOrderOptions), and never re-sorts rows (reorderGroups). Only
// effectiveOrder() below and the Order box's own display reflect it. At most one
// region is provisional at a time (only one row-pair is ever active).
let tempOrder = null; // { region, value } | null

// The order (1-4) in effect for a mid-region: its real pick if assigned, else
// the provisional value if this region is the one being contemplated, else null.
function effectiveOrder(region) {
    const el = document.getElementById(`${region}-order`);
    const raw = el ? el.value : '?';
    if (raw && raw !== '?') {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) return n;
    }
    if (tempOrder && tempOrder.region === region) return tempOrder.value;
    return null;
}

// Resolve a string | [O1,O2,O3,O4,O5] value to one string using the row's order
// selector. Fixed (string) values ignore order; arrays index by order-1.
// Used for BOSS_STATS, WAVE_SET_DESCRIPTIONS and BOSS_WAVE_DESCRIPTIONS.
function pickByOrder(entry, region) {
    if (entry == null) return null;
    if (typeof entry === 'string') return entry;
    const order = effectiveOrder(region);
    return order != null ? entry[order - 1] : null;
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

// The visit order (1-5) used to look up an enemy's observed stats for a row.
// astrael is always first (O1); lifemother always last (O5 — its own scaling
// tier beyond the four mid-run rings). Mid-run regions use their Order dropdown
// (O1-O4); null until one is picked.
function encounterOrder(key) {
    if (key === 'astrael') return 1;
    if (key === 'lifemother') return 5;
    return effectiveOrder(key.split('-')[0]);
}

// Resolve an ENEMY_NOTES value (string | [O1..O5]) to the note for a given order.
// A string is order-invariant; an array indexes by order-1 (null when that order
// has no recorded note). Returns null when there's no note to show.
function noteForOrder(key, order) {
    const e = (typeof ENEMY_NOTES !== 'undefined') ? ENEMY_NOTES[key] : undefined;
    if (e == null) return null;
    if (typeof e === 'string') return e;
    return order ? (e[order - 1] || null) : null;
}

// Render one combatant as: abbreviated name + inline "(atk/hp)" (muted).
// Missing/unparseable stat → "(?)" in the amber unrecorded style. Used for both
// trash enemies and the boss (no special emphasis on the boss — it reads like
// any other unit). `noteKey` (defaults to `name`) keys ENEMY_NOTES for the
// ability-text popover; a boss passes its variant key since the wave-list name
// (e.g. "Maera the Dutiful") differs from the note key (e.g. "Sibling Hierarchy").
// `order` resolves per-order notes (Athane Rage 1→2→3). When a note exists for
// this order the span gets the resolved data-note/data-full-name (read by the
// popover handlers) and drops the native title to avoid a double tooltip; with
// no note, the full name stays on the native title as before.
function enemySpan(name, statStr, noteKey, order) {
    const m = statStr && statStr.match(/(\d+)\D+(\d+)/);
    const num = m ? `(${m[1]}/${m[2]})` : '(?)';
    const cls = m ? 'enemy-stat' : 'enemy-stat unrecorded';
    const disp = name.replace("Mother's ", "M. ");
    const note = noteForOrder(noteKey || name, order);
    const attrs = note
        ? ` data-note="${escapeAttr(note)}" data-full-name="${escapeAttr(name)}"`
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
        return enemySpan(name, v, undefined, order);
    });
    if (bossName && out.includes(bossName)) {
        // The boss's note is keyed by its variant (bossNoteKey), not its
        // wave-list display name — pass it so the popover resolves.
        out = out.split(bossName).join(enemySpan(bossName, bossStat, bossNoteKey, order));
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

// The default info-box prompt for an encounter that is missing one or more of
// its required selections. Astrael/Lifemother (standalone, no order dropdown)
// need only a Variant; region battle rows need Order + Variant + Wave set;
// region boss rows need Order + Variant. Rendered in the default white text so
// it reads as a plain instruction (no amber order-hint styling).
function requirementPrompt(key) {
    if (key.endsWith('-battle')) return 'Select an Order, Variant and Wave set for information';
    if (key.endsWith('-boss')) return 'Select an Order and Variant for information';
    return 'Select a Variant for information';
}

// True once every selection required to render an encounter's full info is set.
// If any required selection is later cleared this returns false, so the prompt
// returns automatically.
function hasRequiredSelections(key) {
    const variantEl = document.getElementById(`${key}-variant`);
    if (!variantEl || !variantEl.value) return false;
    if (!key.includes('-')) return true; // astrael/lifemother: variant only
    const region = key.split('-')[0];
    // Order dropdown's placeholder is "?" (truthy); encounterOrder returns null
    // for it, so use that rather than a raw value check.
    if (encounterOrder(key) === null) return false;
    if (key.endsWith('-battle')) {
        const waveEl = document.getElementById(`${region}-wave-set`);
        if (!waveEl || !waveEl.value) return false;
    }
    return true;
}

function getDisplayText(key) {
    if (!hasRequiredSelections(key)) return requirementPrompt(key);
    const variantEl = document.getElementById(`${key}-variant`);
    {
        const variant = variantEl.value;
        const region = key.includes('-') ? key.split('-')[0] : key;
        const order = encounterOrder(key);
        // The info box shows only the wave list. The boss's name + ATK/HP and its
        // hand-authored description used to lead the box, but that whole first
        // line was dropped — the boss now reads inline in its own wave (hover for
        // stats/notes) and via the grid hover. bossStat is still resolved here to
        // give the in-wave boss its inline ATK/HP. BOSS_STATS is a fixed string
        // (Astrael/Lifemother) or an [O1..O4] array (the four regions).
        const bossStat = pickByOrder(BOSS_STATS[variant], region);
        let text = '';

        // Battle rows: the minor boss is the selected variant (swapBattleBoss
        // puts it in the wave string); it gets inline stats like any enemy.
        if (key.endsWith('-battle')) {
            const waveEl = document.getElementById(`${region}-wave-set`);
            if (waveEl && waveEl.value) {
                const waves = pickByOrder(WAVE_SET_DESCRIPTIONS[waveEl.value], region);
                if (waves) text += (text ? '<br>' : '') + wrapEnemyStats(swapBattleBoss(waves, region, variant), order, variant, bossStat, variant);
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
                text += (text ? '<br>' : '') + wrapEnemyStats(bossWaves, order, bossName, bossStat, bossNoteKey);
            }
        }

        return text;
    }
}

function selectEncounter(row, key) {
    document.querySelectorAll('.selected-row').forEach(r => {
        r.classList.remove('selected-row');
    });

    row.classList.add('selected-row');
    row.dataset.encounterKey = key;
    updateTempOrderForSelection(key);
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

// ---- Persistence (localStorage) ----
// The whole grid state — every dropdown value and the currently selected
// row — is saved on every change and restored on load, so a run survives
// refreshes and reopening the page.
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
    if (state.selectedKey) {
        const label = document.querySelector(`.encounter-label[data-key="${state.selectedKey}"]`);
        if (label) selectEncounter(label.closest('tr'), state.selectedKey);
    }
}

// Dark-themed replacement for window.confirm(): builds an overlay + modal and
// resolves true/false when a button is clicked (or false on Escape/backdrop).
function confirmModal(message, { confirmText = 'OK', cancelText = 'Cancel' } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <p class="modal-message"></p>
                <div class="modal-buttons">
                    <button type="button" class="modal-cancel"></button>
                    <button type="button" class="modal-confirm"></button>
                </div>
            </div>`;
        overlay.querySelector('.modal-message').textContent = message;
        overlay.querySelector('.modal-cancel').textContent = cancelText;
        overlay.querySelector('.modal-confirm').textContent = confirmText;

        function close(result) {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            resolve(result);
        }
        function onKey(e) {
            if (e.key === 'Escape') close(false);
            else if (e.key === 'Enter') close(true);
        }
        overlay.querySelector('.modal-cancel').addEventListener('click', () => close(false));
        overlay.querySelector('.modal-confirm').addEventListener('click', () => close(true));
        overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
        document.addEventListener('keydown', onKey);

        document.body.appendChild(overlay);
        overlay.querySelector('.modal-confirm').focus();
    });
}

async function resetGrid() {
    if (!await confirmModal(
        'Reset the whole grid? This clears every selection for the current run.',
        { confirmText: 'Reset', cancelText: 'Cancel' }
    )) return;
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

// ---- Temporary-order apply/clear (see the tempOrder block near the top) ----
// Smallest turn number (1-4) not assigned to any region. Gap-aware, so with
// O3 already picked and O1/O2 open it returns 1 (not max+1). null if all taken.
function nextUnusedOrder() {
    const taken = new Set();
    REGION_KEYS.forEach(region => {
        const v = document.getElementById(`${region}-order`).value;
        if (v !== '?') taken.add(parseInt(v, 10));
    });
    for (let n = 1; n <= 4; n++) if (!taken.has(n)) return n;
    return null; // all four assigned (can't happen for an unset region)
}

// Preview `region` at the next unused order: set tempOrder and paint the Order
// box amber with an entry flash. Leaves the select value at "?" (see tempOrder).
function applyTempOrder(region) {
    const value = nextUnusedOrder();
    if (value == null) return;
    tempOrder = { region, value };
    const sel = document.getElementById(`${region}-order`);
    if (!sel) return;
    const slot = sel.parentElement;
    const label = slot.querySelector('.label');
    if (label) label.textContent = String(value);
    slot.classList.add('order-temp'); // pulses (CSS) until cleared
    slot.title = 'Provisional order — pick a number to keep it';
}

// Drop the current provisional order and restore the Order box to its real
// (still "?") display.
function clearTempOrder() {
    if (!tempOrder) return;
    const { region } = tempOrder;
    tempOrder = null;
    const sel = document.getElementById(`${region}-order`);
    if (!sel) return;
    const slot = sel.parentElement;
    slot.classList.remove('order-temp');
    slot.title = '';
    updateNodeDisplay(sel); // repaint label from the real value ("?")
}

// Called whenever a row becomes selected: contemplate the newly selected
// mid-region (if its turn is unset) and drop any provisional order left on a
// different region / Astrael / Lifemother.
function updateTempOrderForSelection(key) {
    const region = key.includes('-') ? key.split('-')[0] : null;
    const isMid = region && REGION_KEYS.includes(region);
    if (tempOrder && (!isMid || tempOrder.region !== region)) clearTempOrder();
    if (isMid) {
        const sel = document.getElementById(`${region}-order`);
        if (sel && sel.value === '?' && (!tempOrder || tempOrder.region !== region)) {
            applyTempOrder(region);
        }
    }
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
// Standalone row (astrael / lifemother): no Order cell, variant only,
// remaining columns disabled.
function singleRowHtml(key) {
    return `<tr class="selectable-row" onclick="selectEncounter(this, '${key}')">`
         + `<td class="disabled-cell order-cell">—</td>`
         + `<td class="encounter-label" data-key="${key}"></td>`
         + variantCell(`${key}-variant`)
         + `<td class="disabled-cell">—</td>`
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
        + `</tr>`;

    const boss = `<tr class="selectable-row" onclick="selectEncounter(this, '${bossKey}')">`
        + `<td class="encounter-label" data-key="${bossKey}"></td>`
        + bossVariantCell(bossKey)
        + cell(container(
            slot(`${region}-n2`, 'central-node-select', { aria: `${labelFor(bossKey)} central node 1` }),
            slot(`${region}-n3`, 'central-node-select', { aria: `${labelFor(bossKey)} central node 2` })
          ))
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
populateVariantSelects();
populateWaveSetSelects();
populateOrderSelects();

// Persist any dropdown change (selects fire 'change' which bubbles to the
// table); row clicks call saveState directly.
// An Order pick additionally re-syncs disabled numbers and re-sorts groups.
document.getElementById('encounter-table').addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('order-select')) {
        clearTempOrder(); // a real pick supersedes any provisional order
        refreshOrderOptions();
        // reorderGroups() moves the row's DOM node, which blurs whatever was
        // focused; the node itself survives the move, so re-focus the changed
        // Order select afterward to keep focus on the control the user just set.
        const changed = e.target;
        reorderGroups();
        changed.focus();
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

// ---- Central-node keyboard entry ----
// Fast keyboard entry for the 12 central-node dropdowns. Click a box to focus
// it (the native popup is suppressed — on macOS an open popup swallows keys),
// then press a base's first letter to set it (all 8 base first letters are
// unique); press the same letter again to toggle base <-> the "+" upgrade.
// Backspace/Delete (or "/"/"?") clears back to "?". Tab/Shift+Tab are owned by
// the global tab ring below (central nodes are its final segment).
// The full option list stays reachable via Enter / Space / ArrowDown.
const CENTRAL_LETTER_MAP = (() => {
    const map = {};
    CENTRAL_NODE_OPTIONS.forEach(name => {
        if (name.endsWith('+')) return;            // map base names only
        const letter = name[0].toLowerCase();
        if (!(letter in map)) map[letter] = name;  // first base wins on collision
    });
    return map;
})();

function setCentralNode(sel, value) {
    sel.value = value;
    updateNodeDisplay(sel);   // programmatic value change doesn't fire 'change'
    saveState();
}

function handleCentralNodeKeydown(e) {
    const sel = e.target;
    if (!sel.classList || !sel.classList.contains('central-node-select')) return;

    // Backspace / Delete / "/" / "?": clear back to unset ("/" is the easy
    // one-key alternative to the shifted "?" the box shows when unset).
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '/' || e.key === '?') {
        e.preventDefault();
        setCentralNode(sel, '?');
        return;
    }

    // Single letter (no modifiers, so Cmd+R etc. still work): set the matching
    // base, or toggle base <-> "+". Space/Enter/Arrows fall through to native.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const base = CENTRAL_LETTER_MAP[e.key.toLowerCase()];
        if (!base) return;
        e.preventDefault();
        setCentralNode(sel, sel.value === base ? base + '+' : base);
    }
}

// First click on a box focuses it without opening the native popup, so the
// letter/Tab flow can take over (preventing mousedown default also suppresses
// focus, so focus explicitly). A second click on the already-focused node
// falls through to the native default, opening the menu (like pressing Enter).
// The row's click still fires either way, keeping encounter selection.
function handleCentralNodeMousedown(e) {
    const sel = e.target;
    if (!sel.classList || !sel.classList.contains('central-node-select')) return;
    if (document.activeElement === sel) return;  // already focused → let it open
    e.preventDefault();
    sel.focus();
}

// ---- Global keyboard tab ring ----
// A curated, closed Tab order over the form's primary inputs, following the
// visual top-to-bottom layout (which tracks turn-order sorting). Order:
//   Astrael variant
//   → per region (visual order): Order, Battle variant, Battle wave set,
//     Boss variant, Boss curse (mutator box)
//   → Lifemother variant
//   → every central node, top-to-bottom
//   → wrap back to Astrael variant.
// The mutator "curse" boxes are made focusable so Tab can land on them (they
// show the curse popover on focus — see setupPopovers).

// Region keys in current visual (top-to-bottom) order: the Order selects live
// in the battle rows, which reorderGroups() physically reorders, so their DOM
// order is the visual order.
const visualRegionOrder = () =>
    Array.from(document.querySelectorAll('.order-select')).map(s => s.id.replace(/-order$/, ''));

function buildTabRing() {
    const byId = id => document.getElementById(id);
    const ring = [];
    const push = el => { if (el) ring.push(el); };
    const regions = visualRegionOrder();
    push(byId('astrael-variant'));
    regions.forEach(r => {
        push(byId(`${r}-order`));
        push(byId(`${r}-battle-variant`));
        push(byId(`${r}-wave-set`));
        push(byId(`${r}-boss-variant`));
        push(byId(`${r}-boss-mutator-box`));
    });
    push(byId('lifemother-variant'));
    regions.forEach(r => { push(byId(`${r}-n1`)); push(byId(`${r}-n2`)); push(byId(`${r}-n3`)); });
    return ring;
}

function handleTabRing(e) {
    if (e.key !== 'Tab') return;
    const ring = buildTabRing();
    const i = ring.indexOf(document.activeElement);
    if (i === -1) return;   // focus off the ring (e.g. a mouse-focused track) → native
    e.preventDefault();
    const n = ring.length;
    const next = e.shiftKey ? (i - 1 + n) % n : (i + 1) % n;
    ring[next].focus();
}

// Highlight a region's Battle + Boss rows (both share the rowspan'd Order
// cell). Rows are found by data-key, so it survives reorderGroups() moves.
function highlightRegionRows(region, on) {
    ['battle', 'boss'].forEach(part => {
        const lbl = document.querySelector(`.encounter-label[data-key="${region}-${part}"]`);
        const tr = lbl && lbl.closest('tr');
        if (tr) tr.classList.toggle('order-focus-row', on);
    });
}

(() => {
    const encTable = document.getElementById('encounter-table');
    encTable.addEventListener('keydown', handleCentralNodeKeydown);
    encTable.addEventListener('keydown', handleTabRing);
    encTable.addEventListener('mousedown', handleCentralNodeMousedown);
    // While an Order box is focused, highlight both of its region's rows;
    // and make the row selection (green highlight + info box) follow keyboard
    // focus into a row, so tabbing into a row selects it like a click would.
    encTable.addEventListener('focusin', e => {
        const t = e.target;
        if (t.classList && t.classList.contains('order-select')) {
            highlightRegionRows(t.id.replace(/-order$/, ''), true);
        }
        const row = t.closest && t.closest('tr.selectable-row');
        if (row && !row.classList.contains('selected-row')) {
            const key = row.querySelector('.encounter-label')?.dataset.key;
            if (key) selectEncounter(row, key);
        }
    });
    encTable.addEventListener('focusout', e => {
        if (e.target.classList && e.target.classList.contains('order-select')) {
            highlightRegionRows(e.target.id.replace(/-order$/, ''), false);
        }
    });
    // Take the mutator "curse" boxes out of the Tab flow (the ring is the
    // keyboard path); the ring itself makes them focusable when needed.
    encTable.querySelectorAll('.mutator-box')
        .forEach(el => { el.tabIndex = -1; });
})();

// Restore the saved run last, after every select has its options, then
// apply the saved turn order (disabled numbers + group sort).
restoreState();
refreshOrderOptions();
reorderGroups();

// Refresh mutator boxes after state is restored.
document.querySelectorAll('.variant-select').forEach(sel => refreshMutatorBox(sel));

// Clicking outside the contemplated region's two rows drops its provisional
// order (the info box, blank space, reset button, etc.). Clicks inside the pair
// — including its central-node slots — keep it; selecting another region's row
// is handled by updateTempOrderForSelection, which runs first (the row's
// onclick fires before this bubbles to document), so by here tempOrder already
// points at whichever region was just clicked.
document.addEventListener('click', (e) => {
    if (!tempOrder) return;
    const region = tempOrder.region;
    const inPair = ['battle', 'boss'].some(part => {
        const lbl = document.querySelector(`.encounter-label[data-key="${region}-${part}"]`);
        const tr = lbl && lbl.closest('tr');
        return tr && tr.contains(e.target);
    });
    if (!inPair) clearTempOrder();
});

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

    // Track where the current popover came from: 'info' (an info-box wave-list
    // note) vs 'table' (a row's boss-select / curse box). The info-box rebuild
    // observer below hides only 'info' popovers, so a boss-select popover shown
    // on focus survives the selection rebuild that a forward Tab triggers.
    let popSource = null;
    function showAt(el, html, curse, source) {
        popSource = source || 'table';
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
    function hide() { popSource = null; pop.style.display = 'none'; }

    // Enemy/boss ability notes (green). Note text may contain <br> → innerHTML.
    if (infoBox) {
        infoBox.addEventListener('mouseover', e => {
            const span = e.target.closest('.enemy-stat[data-note]');
            if (!span) return;
            const note = span.dataset.note;
            if (note) showAt(span, `<strong>${escapeAttr(span.dataset.fullName || '')}</strong><br>${note}`, false, 'info');
        });
        infoBox.addEventListener('mouseout', e => {
            const span = e.target.closest('.enemy-stat[data-note]');
            if (span && !span.contains(e.relatedTarget)) hide();
        });
        // Rebuild of the info box stales an info-box hover popover → hide it, but
        // leave a 'table' popover (e.g. a boss-select shown on focus) alone.
        new MutationObserver(() => { if (popSource === 'info') hide(); }).observe(infoBox, { childList: true });
    }

    // Boss-selection dropdown (green note popover, with ATK/HP appended in
    // parens here — the stats aren't shown on the select otherwise). Astrael's
    // variant is a featured-enemy label, so name/note key on Astrael itself.
    function showBossSelect(sel) {
        const variant = sel.value;
        if (!variant || typeof BOSS_STATS === 'undefined' || !(variant in BOSS_STATS)) return;
        const key = sel.id.replace(/-variant$/, '');
        const region = key.includes('-') ? key.split('-')[0] : key;
        const name = key === 'astrael' ? 'Astrael the First Reborn' : variant;
        // Order-dependent boss (an [O1..O4] array) with no Order picked yet: the
        // stats/note can't resolve, so prompt for an Order rather than show "(?)".
        if (Array.isArray(BOSS_STATS[variant]) && encounterOrder(key) === null) {
            showAt(sel, `<strong>${escapeAttr(name)}</strong><br>Select an Order to see stats`, false);
            return;
        }
        const statStr = pickByOrder(BOSS_STATS[variant], region);
        const m = statStr && statStr.match(/(\d+)\D+(\d+)/);
        const parens = m ? ` (${m[1]}/${m[2]})` : ' (?)';
        const noteEntry = (typeof ENEMY_NOTES !== 'undefined') ? ENEMY_NOTES[name] : null;
        const note = pickByOrder(noteEntry, region) || '';
        showAt(sel, `<strong>${escapeAttr(name)}</strong>${parens}${note ? '<br>' + note : ''}`, false);
    }

    // Encounter-table: boss defeat-mutator "curse" boxes (red) and boss-variant
    // selects (green note + appended ATK/HP). Shown on hover AND on focus, so
    // the same info surfaces when Tab-ringing through with the keyboard.
    function showForTarget(target) {
        const box = target.closest('.mutator-box[data-curse-key]');
        if (box) {
            const m = typeof MUTATORS !== 'undefined' && MUTATORS[box.dataset.curseKey];
            if (m) showAt(box, `<strong>${escapeAttr(m.name)}</strong><br>${escapeAttr(m.effect)}`, true);
            return;
        }
        const sel = target.closest('.variant-select');
        if (sel) showBossSelect(sel);
    }
    if (table) {
        table.addEventListener('mouseover', e => showForTarget(e.target));
        table.addEventListener('mouseout', e => {
            const t = e.target.closest('.mutator-box[data-curse-key], .variant-select');
            if (t && !t.contains(e.relatedTarget)) hide();
        });
        table.addEventListener('focusin', e => showForTarget(e.target));
        table.addEventListener('focusout', hide);
    }
})();

// ---- Champion win/loss record (Champion Record screen) ----
// A per-champion Win/Loss tally, fully independent of the run grid: its own
// localStorage key and Reset button (resetGrid never touches it, and vice
// versa), drag-reorderable rows, and a click-to-highlight selection. Rendered
// into the two-column grid (#champion-grid) on the Champion Record screen.
// Built from CHAMPION_CLANS (gamefacts.js); default order is alphabetical by
// clan then champion, but the clan isn't shown.
const CHAMPION_STORAGE_KEY = 'mt2-champion-records-v1';

// Flattened default order: sort by clan name, then champion name.
const CHAMPION_DEFAULTS = CHAMPION_CLANS
    .flatMap(c => c.champions.map(ch => ({ name: ch.name, alias: ch.alias, clan: c.clan })))
    .sort((a, b) => a.clan.localeCompare(b.clan) || a.name.localeCompare(b.name));
const CHAMPION_BY_NAME = Object.fromEntries(CHAMPION_DEFAULTS.map(c => [c.name, c]));

// In-memory records: { name: {win, loss} }. Row order lives in the DOM and is
// serialized alongside the counts on save. selectedChamp is the currently
// highlighted row (name), or null.
let championRecords = {};
let selectedChamp = null;

function loadChampionOrder() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(CHAMPION_STORAGE_KEY)); } catch (e) { /* ignore */ }
    // Seed every champion at 0/0, then overlay any saved counts.
    championRecords = {};
    CHAMPION_DEFAULTS.forEach(c => { championRecords[c.name] = { win: 0, loss: 0 }; });
    if (saved && saved.records) {
        Object.entries(saved.records).forEach(([name, rec]) => {
            if (!championRecords[name]) return; // dropped from the game since saved
            championRecords[name].win = Math.max(0, parseInt(rec.win, 10) || 0);
            championRecords[name].loss = Math.max(0, parseInt(rec.loss, 10) || 0);
        });
    }
    selectedChamp = (saved && CHAMPION_BY_NAME[saved.selected]) ? saved.selected : null;
    // Start from the saved order (valid names only), then append any champions
    // it's missing so new ones show up at the bottom rather than vanishing.
    const order = (saved && Array.isArray(saved.order)) ? saved.order.filter(n => CHAMPION_BY_NAME[n]) : [];
    CHAMPION_DEFAULTS.forEach(c => { if (!order.includes(c.name)) order.push(c.name); });
    return order;
}

function saveChampionState() {
    const order = Array.from(document.querySelectorAll('#champion-grid .champion-row'))
        .map(r => r.dataset.champ);
    try {
        localStorage.setItem(CHAMPION_STORAGE_KEY,
            JSON.stringify({ order, records: championRecords, selected: selectedChamp }));
    } catch (e) { /* storage unavailable — ignore */ }
}

// Highlight one champion row (or clear with null). Updates the DOM class,
// stores the choice, and persists.
function setSelectedChamp(name) {
    selectedChamp = name;
    document.querySelectorAll('#champion-grid .champion-row').forEach(r => {
        r.classList.toggle('champ-selected', r.dataset.champ === name);
    });
    saveChampionState();
}

// One champion's row: a drag grip, the alias, and independent Win/Loss
// counters. A <div> row (not a table row) so the 24 rows can flow into the
// two-column grid (#champion-grid).
function championRow(name) {
    const c = CHAMPION_BY_NAME[name];
    const rec = championRecords[name];
    const row = document.createElement('div');
    row.className = 'champion-row';
    row.draggable = true;
    row.dataset.champ = name;
    const counter = (stat, label, cls, val) =>
        `<span class="champ-counter">` +
        `<span class="counter-label ${cls}">${label}</span>` +
        `<button type="button" class="counter-btn" data-stat="${stat}" data-delta="-1" aria-label="Decrease ${c.alias} ${stat}">−</button>` +
        `<span class="counter-val" data-stat="${stat}">${val}</span>` +
        `<button type="button" class="counter-btn" data-stat="${stat}" data-delta="1" aria-label="Increase ${c.alias} ${stat}">+</button>` +
        `</span>`;
    row.innerHTML =
        `<span class="champ-grip" title="Drag to reorder">⠿</span>` +
        `<span class="champ-alias">${c.alias}</span>` +
        counter('win', 'W', 'win', rec.win) +
        counter('loss', 'L', 'loss', rec.loss);
    return row;
}

function renderChampions(order) {
    const grid = document.getElementById('champion-grid');
    grid.innerHTML = '';
    order.forEach(name => {
        const row = championRow(name);
        if (name === selectedChamp) row.classList.add('champ-selected');
        grid.appendChild(row);
    });
}

async function resetChampions() {
    if (!await confirmModal(
        'Reset the champion record? This clears every win/loss count and restores the default order. The run grid is not affected.',
        { confirmText: 'Reset', cancelText: 'Cancel' }
    )) return;
    try { localStorage.removeItem(CHAMPION_STORAGE_KEY); } catch (e) { /* ignore */ }
    CHAMPION_DEFAULTS.forEach(c => { championRecords[c.name] = { win: 0, loss: 0 }; });
    selectedChamp = null;
    renderChampions(CHAMPION_DEFAULTS.map(c => c.name));
}

// Restore the default champion order without touching the win/loss counts or
// the highlight. Re-renders (which keeps current records + selection) and
// persists the new order.
async function resetChampionOrder() {
    if (!await confirmModal(
        'Reset the champion order to the default? Win/loss counts are kept.',
        { confirmText: 'Reset order', cancelText: 'Cancel' }
    )) return;
    renderChampions(CHAMPION_DEFAULTS.map(c => c.name));
    saveChampionState();
}

(function initChampions() {
    const grid = document.getElementById('champion-grid');
    if (!grid || typeof CHAMPION_CLANS === 'undefined') return;
    renderChampions(loadChampionOrder());

    // Clicks in a row: a +/- button adjusts the count (and highlights the row);
    // clicking anywhere else on the row toggles the highlight.
    grid.addEventListener('click', e => {
        const row = e.target.closest('.champion-row');
        if (!row) return;
        const name = row.dataset.champ;
        const btn = e.target.closest('.counter-btn');
        if (btn) {
            const stat = btn.dataset.stat;
            const next = Math.max(0, championRecords[name][stat] + parseInt(btn.dataset.delta, 10));
            championRecords[name][stat] = next;
            row.querySelector(`.counter-val[data-stat="${stat}"]`).textContent = next;
            setSelectedChamp(name); // working with a row highlights it (also saves)
            return;
        }
        // Toggle: click the highlighted row again to clear it.
        setSelectedChamp(selectedChamp === name ? null : name);
    });

    // Drag-to-reorder across the two columns: pick the insertion point by 2-D
    // proximity (nearest row center) so moving between columns works. The
    // dragged row moves live, and the new order is persisted on drop.
    let dragRow = null;
    function champDragAfter(x, y) {
        const rows = [...grid.querySelectorAll('.champion-row:not(.dragging)')];
        let best = null, bestDist = Infinity, before = true;
        rows.forEach(row => {
            const b = row.getBoundingClientRect();
            const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            const d = Math.hypot(x - cx, y - cy);
            if (d < bestDist) { bestDist = d; best = row; before = y < cy; }
        });
        if (!best) return null;
        return before ? best : best.nextElementSibling; // insertBefore ref; null -> append
    }
    grid.addEventListener('dragstart', e => {
        dragRow = e.target.closest('.champion-row');
        if (!dragRow) return;
        dragRow.classList.add('dragging');
        setSelectedChamp(dragRow.dataset.champ); // working with a row highlights it
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragRow.dataset.champ); } catch (_) { /* Firefox needs data set */ }
    });
    grid.addEventListener('dragover', e => {
        if (!dragRow) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const ref = champDragAfter(e.clientX, e.clientY);
        if (ref == null) grid.appendChild(dragRow);
        else if (ref !== dragRow) grid.insertBefore(dragRow, ref);
    });
    grid.addEventListener('drop', e => e.preventDefault());
    grid.addEventListener('dragend', () => {
        if (!dragRow) return;
        dragRow.classList.remove('dragging');
        dragRow = null;
        saveChampionState();
    });
})();

// ---- Screens ----
// Three screens, one visible at a time: 'tracker' (Run Tracker), 'champions'
// (Champion Record), 'help' (Help). The buttons at the bottom of each screen
// switch between them.
function showScreen(name) {
    ['tracker', 'champions', 'help'].forEach(n => {
        document.getElementById('screen-' + n).classList.toggle('active', n === name);
    });
}

// First-time visitors (nothing saved in localStorage) land on Help; returning
// visitors keep the default Run Tracker. State is only written once the user
// interacts, so Help shows exactly once — before any interaction.
(function pickInitialScreen() {
    if (!document.getElementById('screen-help')) return;
    let hasSaved = false;
    try {
        hasSaved = localStorage.getItem(STORAGE_KEY) !== null
                || localStorage.getItem(CHAMPION_STORAGE_KEY) !== null;
    } catch (e) { /* storage unavailable — treat as first visit */ }
    if (!hasSaved) showScreen('help');
})();
