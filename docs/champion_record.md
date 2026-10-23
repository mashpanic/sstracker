# App layout: four screens + Win-Loss

`index.html` presents the app as **four screens, one visible at a time**,
switched by the buttons at the bottom of each screen. This replaced the earlier
side-by-side layout (tracker left, champion panel right) on 2026-07-17. The
per-champion win/loss screen is labelled **Win-Loss** in the UI (its internal
id is still `#screen-champions`).

| # | Screen | id | Button row (left → right) |
|---|--------|----|---------------------------|
| 1 | **Run Tracker** | `#screen-tracker` | *Win-Loss* · *Help* · *Souls* · *Reset grid* |
| 2 | **Win-Loss** | `#screen-champions` | *Run Tracker* · *Reset record* · *Reset order* |
| 3 | **Help** | `#screen-help` | *Run Tracker* |
| 4 | **Souls** | `#screen-souls` | *Close Souls* (top right, sticky; returns to the screen you came from) |

Screens are toggled by `showScreen('tracker'|'champions'|'help'|'souls')` (in `app.js`),
which just flips the `.active` class. Each screen has its own fixed-label
navigation button, so there is no single shared toggle.

**Initial screen.** On load `pickInitialScreen()` shows **Help** to first-time
visitors (nothing saved in `localStorage`) and the **Run Tracker** to returning
ones. State is only written once you interact, so Help appears exactly once —
before any interaction — then never again.

**Attribution.** The two-line data-source / CC-BY-SA notice lives only on the
Run Tracker screen (screen 1).

## Screen 2 — Win-Loss

A per-champion **Win/Loss tally** for the 24 Soul Savior starting champions,
kept across many runs, plus a **streak** marker. **Completely independent of the
run grid** — its own storage, its own reset buttons. Redesigned 2026-10-22 around
champion card art (the old two-column text list, drag-reorder and lap arrows are
gone).

### What it shows

- A **fixed 6 × 4 grid of square card-art tiles**, left-aligned inside the page's
  20px padding. Tile size follows the window (floor 150px); the grid never
  reflows, so a small window just cuts it off.
- Tiles are in the game's **log-book order** (`CHAMPION_LOG_ORDER` in
  `gamefacts.js`; Fel, Talos, Lord Fenix, …). Art is `champion-art/*.webp`
  (square crops of the log-book card art; PNG masters and the crop offsets live
  in the git-ignored `champions/` folder).
- Each tile shows its record as a **W–L pill** bottom right (wins green, losses
  red). A **green inset border** marks champions in the current **streak**; a
  **white outline** marks the selected champion.

### Interactions (bottom bar, same `.bar-btn` look as the other screens)

Left to right: `Streak: N` · selected champion's name + W-L · **W+ W− L+ L−** ·
**Add to streak** (reads *In streak ✓* when the champion is in) · **Reset
streak** · **Reset record** · **Run Tracker** · **Help**.

- **Select** — click a tile. One champion is always selected (never cleared);
  Fel is selected by default.
- **W+/W−/L+/L−** change the selected champion's counts (clamped at 0). They
  never touch the streak.
- **Add to streak** toggles the selected champion in/out of the streak.
- **Reset streak** clears the streak, keeps all counts (asks first).
- **Reset record** clears all counts, keeps the streak (asks first).

### Persistence

`localStorage` key **`mt2-champion-records-v1`**: `{ records: {name:{win,loss}},
selected, streak: [names] }`, written on every change. Older saves (which also
held a row `order` and a per-champion `lap` arrow) still load; the extra fields
are ignored, and the old lap's wins/losses were already part of the totals.

## Where it lives in the code

- **Data source:** `CHAMPION_LOG_ORDER` (order + art path) and `CHAMPION_CLANS`
  (alias lookup) in `gamefacts.js`; read-only to the app.
- **Markup/styling:** `#screen-champions` in `index.html` — `#champion-grid`
  (tiles built by `app.js`), `.champion-tile`, `.champ-record`, the bottom
  `.champ-bottom` button row, `#champ-editor`.
- **Logic (`app.js`):** the "Champion win/loss record" section —
  `loadChampionState`, `saveChampionState`, `updateChampUI`, `setSelectedChamp`,
  `toggleStreak`, `resetStreak`, `resetChampions`, and the `initChampions` IIFE.
