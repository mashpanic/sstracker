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
function getDisplayText(key) {
    const info = encounterInfo[key];
    const variantEl = document.getElementById(`${key}-variant`);
    if (variantEl && variantEl.value) {
        const variant = variantEl.value;
        let text = variantDescriptions[variant]
            ? variant + ': ' + variantDescriptions[variant]
            : variant + ' information';

        // Append stats if available. Fixed stats (Astrael/Lifemother) are stored
        // as a string; order-scaled stats (four main regions) are stored as an array.
        if (BOSS_STATS[variant]) {
            const entry = BOSS_STATS[variant];
            if (typeof entry === 'string') {
                text += '<br>' + entry;
            } else {
                const region = key.split('-')[0];
                const orderEl = document.getElementById(`${region}-order`);
                const order = orderEl ? parseInt(orderEl.value, 10) : NaN;
                const stats = !Number.isNaN(order) ? entry[order - 1] : null;
                if (stats) text += '<br>' + stats;
            }
        }

        // For battle rows, append the wave set description if one is selected.
        if (key.endsWith('-battle')) {
            const region = key.split('-')[0];
            const waveEl = document.getElementById(`${region}-wave-set`);
            if (waveEl && waveEl.value && WAVE_SET_DESCRIPTIONS[waveEl.value]) {
                text += '<br>' + WAVE_SET_DESCRIPTIONS[waveEl.value];
            }
        }

        // Append mutator info if this variant grants one on defeat.
        if (MUTATORS[variant]) {
            const m = MUTATORS[variant];
            text += `<br>Defeat mutator — <em>${m.name}</em>: ${m.effect}`;
        }

        // For boss rows and standalone rows (astrael, lifemother), append wave description.
        const regionKey = key.includes('-') ? key.split('-')[0] : key;
        if ((key.endsWith('-boss') || !key.includes('-')) && BOSS_WAVE_DESCRIPTIONS[regionKey]) {
            text += '<br>' + BOSS_WAVE_DESCRIPTIONS[regionKey];
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
        box.textContent = mutator.name;
        box.title = mutator.effect;
        box.classList.add('has-mutator');
    } else {
        box.textContent = '—';
        box.title = '';
        box.classList.remove('has-mutator');
    }
}

function handleVariantChange(selectEl) {
    const row = selectEl.closest('tr');
    if (!row) return;

    refreshMutatorBox(selectEl);

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
        `<div class="mutator-box" id="${bossKey}-mutator-box" title="">—</div>`
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
