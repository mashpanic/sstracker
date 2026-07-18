# App layout: three screens + Champion Record

`index.html` presents the app as **three screens, one visible at a time**,
switched by the buttons at the bottom of each screen. This replaced the earlier
side-by-side layout (tracker left, champion panel right) on 2026-07-17.

| # | Screen | id | Button row (left → right) |
|---|--------|----|---------------------------|
| 1 | **Run Tracker** | `#screen-tracker` | *Show Champion Record* · *Reset grid* · *Help* |
| 2 | **Champion Record** | `#screen-champions` | *Show Run Tracker* · *Reset record* |
| 3 | **Help** | `#screen-help` | *Show Run Tracker* |

Screens are toggled by `showScreen('tracker'|'champions'|'help')` (in `app.js`),
which just flips the `.active` class. Each screen has its own fixed-label
navigation button, so there is no single shared toggle.

**Initial screen.** On load `pickInitialScreen()` shows **Help** to first-time
visitors (nothing saved in `localStorage`) and the **Run Tracker** to returning
ones. State is only written once you interact, so Help appears exactly once —
before any interaction — then never again.

**Attribution.** The two-line data-source / CC-BY-SA notice lives only on the
Run Tracker screen (screen 1).

## Screen 2 — Champion Record

A per-champion **Win/Loss tally** for the 24 Soul Savior starting champions,
kept across many runs. It is **completely independent of the run grid** — its
own storage, its own reset button — so clearing a run never touches your
record, and vice versa.

### What it shows

- **24 rows**, one per starting champion, labeled by the champion's short
  **alias** only (the clan is not displayed).
- Laid out in **two columns**: champions 1–12 fill the **left** column
  top-to-bottom, 13–24 the **right**, sized to roughly span the run-tracker
  table's width.
- **Default order** is alphabetical by **clan**, then by **champion name** (so
  it opens Sentient, Wyldenten, Fel, Talos, …). The clan drives the sort even
  though it isn't shown, which is why same-clan champions sit adjacent.
- Each row shows the champion's record as a read-only **win-loss score**
  (e.g. "7-3", white text). A drag grip (`⠿`) sits on the left of each row.
  Editing is done through the bottom editor, not per-row.

### Interactions

- **Select** — click a champion's row to select it (green highlight); click it
  again to clear the selection. Only one champion is selected at a time.
- **Adjust the record (bottom editor)** — a grouped, segmented
  **W+ / W− / L+ / L−** button set sits on the bottom row (aligned with the
  second champion column), followed by the selected champion's name and W-L
  score. The buttons are **disabled until a champion is selected**; once one is,
  they change that champion's counts (clamped at 0), updating both the row's
  score and the editor's score live.
- **Reorder** — drag any row by its grip (or anywhere on the row). The row
  moves live as it passes the others, and the new order is saved. Dragging
  **between the two columns** works — the insertion point is chosen by 2-D
  proximity to the nearest row.
- **Reset order** — restores the default champion order **without changing any
  counts** (asks first).
- **Reset record** — clears every win/loss count but **keeps the current
  order** (asks first). It does **not** affect the run grid. The run grid's
  separate "Reset grid" button likewise never touches this screen.

### Persistence

Counts, row order, and the current highlight are saved to `localStorage` under
the key **`mt2-champion-records-v1`**, separate from the run grid's
`mt2-soul-savior-state-v1`. Written on every change and restored on load, so
the record survives refreshes. A champion missing from a saved order (e.g. a
future roster change) is appended to the bottom rather than lost, and unknown
saved names are ignored.

## Where it lives in the code

- **Data source:** `CHAMPION_CLANS` in `gamefacts.js` (hand-authored wiki
  facts — the 24 champions grouped under their 12 clans, each with a short
  alias). The code reads this read-only; it never writes `gamefacts.js`.
- **Markup:** the three `.screen` divs in `index.html` — `#screen-tracker`
  (table + info box), `#screen-champions` (the `#champion-grid` two-column grid,
  plus the `.champ-bottom` row holding the nav/reset buttons and the
  `#champ-editor` win/loss editor), and `#screen-help` (`#help-content`
  read-only text).
- **Styling:** the `.screen` / `.button-row` / `.screen-toggle`,
  `#champion-grid`, `.champion-row` (flex div rows), `.champ-*` (incl.
  `.champ-record`, `.champ-bottom`, `.champ-editor`), `.btn-group` (the
  segmented editor buttons), and `#help-content` rules in `index.html`'s
  `<style>` block.
- **Logic (all in `app.js`):** `showScreen` and `pickInitialScreen` for the
  screens; and the "Champion win/loss record" section — `CHAMPION_DEFAULTS`,
  `loadChampionOrder`, `saveChampionState`, `setSelectedChamp`,
  `updateChampEditor`, `championRow`, `renderChampions`, `resetChampions`,
  `resetChampionOrder`, and the `initChampions` IIFE that wires the row-select,
  drag, and bottom-editor handlers onto `#champion-grid` / `#champ-editor`.
