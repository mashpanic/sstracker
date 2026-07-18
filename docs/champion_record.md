# Champion Record panel

A per-champion **Win/Loss tally** shown on the right side of the tracker
(`index.html`). It lets you keep a running success/fail record for each of the
24 Soul Savior starting champions across many runs. It is **completely
independent of the run grid** — its own storage, its own reset button — so
clearing a run never touches your record, and vice versa.

## What it shows

- **24 rows**, one per starting champion, labeled by the champion's short
  **alias** only (the clan is not displayed).
- **Default order** is alphabetical by **clan**, then by **champion name**
  (so it opens Sentient, Wyldenten, Fel, Talos, …). The clan drives the sort
  even though it isn't shown, which is why same-clan champions sit adjacent.
- Each row has two independent counters — a green **W** (wins) and a red **L**
  (losses) — each with **−/+** buttons around the number. Counts never go
  below 0.
- A drag grip (`⠿`) on the left of each row.

## Interactions

- **Adjust a record** — click a row's **−**/**+** to change its win or loss
  count. Wins and losses are independent; both clamp at 0.
- **Reorder** — drag any row up or down by its grip (or anywhere on the row);
  the row moves live as it passes the others, and the new order is saved.
- **Highlight a row** — click a champion's **name** (or anywhere on the row
  that isn't a +/- button) to highlight it (green background + green name).
  Click the highlighted name again to clear it. **Working with** a row —
  clicking one of its counter buttons, or starting a drag — also highlights it.
  Only one row is highlighted at a time.
- **Reset record** — the button at the bottom of the panel clears every
  win/loss count, drops the highlight, and restores the default order. It
  asks for confirmation first and does **not** affect the run grid. The run
  grid's separate "Reset grid" button likewise never touches this panel.

## Persistence

All of it — counts, row order, and the current highlight — is saved to
`localStorage` under the key **`mt2-champion-records-v1`**, separate from the
run grid's `mt2-soul-savior-state-v1`. It is written on every change and
restored on load, so the record survives refreshes. A champion that is missing
from a saved order (e.g. a future roster change) is appended to the bottom
rather than lost, and unknown saved names are ignored.

## Where it lives in the code

- **Data source:** `CHAMPION_CLANS` in `gamefacts.js` (hand-authored wiki
  facts — the 24 champions grouped under their 12 clans, each with a short
  alias). The panel reads this read-only; it never writes `gamefacts.js`.
- **Markup + styling:** the `#champion-panel` `<aside>` (holding
  `#champion-table` and the `#reset-champions` button) inside the
  `#app-layout` two-column flex wrapper in `index.html`, plus the
  `.champion-*` / `.champ-*` / `.counter-*` CSS rules in its `<style>` block.
  On a narrow window the panel wraps below the tracker table; on a wide window
  it sits to the right.
- **Logic:** the "Champion win/loss record" section at the end of `app.js`
  (`CHAMPION_DEFAULTS`, `loadChampionOrder`, `saveChampionState`,
  `setSelectedChamp`, `championRow`, `renderChampions`, `resetChampions`, and
  the `initChampions` IIFE that wires the click/drag handlers).
