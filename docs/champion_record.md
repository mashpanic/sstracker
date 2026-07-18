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
- Each row has two independent counters — a green **W** (wins) and a red **L**
  (losses) — each with **−/+** buttons around the number. Counts never go below
  0. A drag grip (`⠿`) sits on the left of each row.

### Interactions

- **Adjust a record** — click a row's **−**/**+** to change its win or loss
  count. Wins and losses are independent; both clamp at 0.
- **Reorder** — drag any row by its grip (or anywhere on the row). The row
  moves live as it passes the others, and the new order is saved. Dragging
  **between the two columns** works — the insertion point is chosen by 2-D
  proximity to the nearest row.
- **Highlight a row** — click a champion's **name** (or anywhere on the row
  that isn't a +/- button) to highlight it (green background + green name).
  Click the highlighted name again to clear it. **Working with** a row —
  clicking one of its counter buttons, or starting a drag — also highlights it.
  Only one row is highlighted at a time.
- **Reset record** — clears every win/loss count, drops the highlight, and
  restores the default order. It asks for confirmation first and does **not**
  affect the run grid. The run grid's separate "Reset grid" button likewise
  never touches this screen.

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
  (table + info box), `#screen-champions` (the `#champion-grid` two-column grid
  + `#reset-champions`), and `#screen-help` (`#help-content` read-only text).
- **Styling:** the `.screen` / `.button-row` / `.screen-toggle`,
  `#champion-grid`, `.champion-row` (flex div rows), `.champ-*` / `.counter-*`,
  and `#help-content` rules in `index.html`'s `<style>` block.
- **Logic (all in `app.js`):** `showScreen` and `pickInitialScreen` for the
  screens; and the "Champion win/loss record" section — `CHAMPION_DEFAULTS`,
  `loadChampionOrder`, `saveChampionState`, `setSelectedChamp`, `championRow`,
  `renderChampions`, `resetChampions`, and the `initChampions` IIFE that wires
  the click/drag handlers onto `#champion-grid`.
