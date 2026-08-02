# Handoff: tAPIr Scripts Marketplace

## Overview

tAPIr is a community marketplace where Archicad users publish Tapir scripts and add-ons.
Contributors upload a script with metadata, media and contact details; anyone can browse,
filter, download, rate and discuss. Every script is free at launch, with the data model and
UI already prepared for a price and for optional "pay what you like" contributions.

Discussion is deliberately unified: a comment left on a script IS a forum thread, tagged with
that script's name and category, so all community conversation is searchable in one place.

## About the design files

`design/Tapir Marketplace Wireframes.dc.html` is a **design reference created in HTML** — a
prototype showing intended structure and behaviour. It is not production code to lift.
Recreate these screens in the target codebase using its own framework, router, data layer and
component library. If no codebase exists yet, pick the stack (a React/Next.js app with a
Postgres-backed API is a natural fit for this feature set) and build the screens there.

To view the reference: open the `.dc.html` file in a browser (it needs `support.js`, kept
alongside it). The page is a pan/zoom canvas holding seven labelled options, `1a` to `1g`.

## Fidelity

**Low fidelity.** These are grayscale wireframes: boxes, hairline rules and labels. They define
layout, information hierarchy, content and flow. They deliberately make **no** final visual
decisions — the greys, borders and type sizes in the HTML are wireframe scaffolding and should
NOT be copied.

**Apply the Modernist design system for all styling.** It is bundled in `design-system/`
(`styles.css` = the token sheet plus the component layer, `readme.md` = the usage guide).
Summary of what that means in practice:

- Ground `#f3f2f2`, ink `#201e1d`, single accent `#ec3013`, used sparingly.
- Archivo for both headings and body (`--font-heading` / `--font-body`).
- **Zero border radius anywhere.** `--radius-md` is 0 on purpose.
- Strong 2px dividers (`--color-divider`) between major sections; visible modular grid.
- Everything flush left, including labels inside wide buttons.
- Photographs and screenshots go through the `.grayscale` wrapper.
- Take every color, space and size from `var(--*)` tokens; never hard-code a hex or px value
  the tokens already carry.
- Icons: Lucide.
- Focus: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.
- Reuse its classes rather than inventing parallel ones: `.btn` (`.btn-primary`,
  `.btn-secondary`, `.btn-ghost`, `.btn-icon`), `.tag`, `.card`, `.field`/`.input`/`.seg`,
  `.nav`, `.table`, `.dialog`, `.hr`, `.grayscale`.

Where the wireframe shows a chip, use `.tag`. Where it shows an outlined rectangle with a
label, use the matching `.btn` variant. Where it shows a bordered panel, use `.card`.

## Screens / views

### Site map (`1a` in the reference — documentation only, not a screen to build)

| Group | Screens |
| --- | --- |
| Public, no auth | Home / browse grid, Category view, Search results, Script detail, Forum index, Forum thread, Contributor profile, About / how to publish |
| Auth | Sign in, Create account, Contributor details (first run) |
| Contributor, signed in | Dashboard (my scripts), Add / edit script, Version history, Delete confirm, Comments inbox, Profile & contacts, Payouts (later phase) |

Reading is open to everyone. Rating, commenting and posting require sign in.

---

### 1. Home / browse grid (`1b`)

**Purpose:** discover a script fast, by category, freshness, rating or popularity.

**Layout:** desktop only, max content width ~1180px, three regions.

- **Header bar** (`.nav`): full width, ~58px tall, bottom 2px divider. Left cluster: circular
  tapir mark 26px, wordmark "tAPIr" 15px, and a muted one-line strapline
  "scripts and add-ons, shared by the Archicad community". Right cluster: search input
  (~200px, placeholder "search scripts, authors, threads"), a "Forum" secondary button, and a
  primary "Sign in" button.
- **Left rail**, 216px fixed, right 1px divider, 20px/18px padding. Label `CATEGORY`
  (uppercase, tracked, muted, 10px), then the category list. Each row: label flush left,
  count flush right, 5px/8px padding. The active row gets a tinted fill and a 1px border; all
  others are borderless until hover.
- **Content column**, flexible, 20px/24px padding. Top row: result count on the left
  ("12 scripts in All"), `SORT` label plus four sort chips on the right — Newest, Oldest,
  Rating, Downloads. Active chip is tinted with a full-strength border.
- **Card grid:** `repeat(3, 1fr)`, 14px gap, cards min-height 180px.

**Script card anatomy** (top to bottom, 10px gaps, 14px padding):

1. Row: 34px square icon (grayscale placeholder) · name (13px) over author + company
   (10.5px muted) · price badge, right aligned, outlined (`Free` or e.g. `29 EUR`).
2. Short description, 11px, 1.55 line-height, muted, 2 to 3 lines, `text-wrap: pretty`.
3. Pinned to the bottom: a 1px top rule, then category left / `v1.4` right; below it a metrics
   row — star glyphs plus numeric rating, download count, `AC 26-28`.

Whole card is the link target; hover raises the border to full strength.

**Categories** (fixed list, in this order): All, Documentation & Layouts,
Element Data & Properties, Modeling & Geometry, Zones & Areas, Import/Export,
Quality Assurance, Quantities & Scheduling, Libraries & Objects, Navigator & Views,
Classification & Attributes, Batch Automation, Utilities.

---

### 2. Script detail (`1c`)

**Purpose:** decide whether to download, then ask the author a question.

**Layout:** breadcrumb strip (`Home / Zones & Areas / Sum Area Script`, 11px muted, bottom
divider), then a two-column body: main column flexible with a right 1px divider, sidebar
300px fixed. Both 26px/24px padding.

**Main column, in order:**

- Header row: 64px icon square, title 22px, meta line 11px muted —
  `author, company · updated 12 days ago · v1.4 · AC 26 to 28`.
- Hero screenshot, 300px tall, full column width, 16:9 source (1600x900). Below it a 10px-gap
  strip of 110x66 thumbnails; the active one has a full-strength border. The optional video
  occupies the last thumbnail slot and opens a player.
- `WHAT IT DOES` label, then the long description at 13px / 1.7, capped at 66ch. Below it a
  smaller muted requirements block (add-on dependency, OS, how to run).
- Discussion block, separated by a top divider: header row `DISCUSSION, 14 POSTS` on the left,
  `also listed in Forum / <Category>` on the right. Then the composer (a bordered field:
  "Ask a question or share how you used this. Posting signs you in."). Then the thread: each
  post is a 28px round avatar plus a body of meta line (11px muted), text (12.5px / 1.65),
  and actions (`Reply`, `n helpful`). Replies indent 14px behind a 1px left rule; the author's
  own replies carry an `author` marker in the meta line.

**Sidebar, in order:**

- Primary `Download, 84 KB` button (full width), secondary `Contribute, pay what you like`,
  then 10.5px muted note: "Free. The author accepts optional contributions. Paid items show a
  price here instead." For a paid script, swap the primary for `Buy 29 EUR` and drop the
  contribute button.
- Spec list behind a top divider, label left / value right, 11px:
  Rating (`4.6, 23 votes`), Downloads, Category, Version, Archicad, License.
- Rate-this panel: bordered box, `RATE THIS` label, five interactive stars.
- Author block behind a top divider: 40px round avatar, name, company and city, script count
  and links.

---

### 3. Forum index (`1d`)

**Purpose:** one searchable place for every conversation, whether it started on a script or
as a standalone topic.

**Layout:** ~900px column.

- Header row: title "Forum" 16px; right side a search input (~220px,
  "search all discussion") and a primary `New topic` button.
- Filter strip behind a divider: wrapping row of category chips, active chip tinted. The list
  is the twelve script categories plus two discussion-only ones, `Help wanted` and
  `Show and tell`.
- Thread rows, 16px/24px padding, separated by 1px rules, hover tint:
  28px round avatar · title (13px) over meta (10.5px muted) · right-aligned reply count and
  last-activity time on two lines.
- Meta line format: `Category · on <Script Name>` for script-bound threads, or
  `Category · topic` for standalone ones, then ` · author`.
- Footer note: "Threads tied to a script carry its name as a tag, so a question asked on a
  script card is findable here."

---

### 4. Contributor dashboard (`1e`)

**Purpose:** see performance and manage published scripts.

**Layout:** ~900px column.

- Header: "My scripts" 15px over the contributor's name and company (10.5px muted); right side
  `Profile & contacts` secondary button and `Upload new script` primary button.
- Stat strip: four equal cells divided by 1px rules — Published, Draft, Downloads,
  Unread comments. Number 18px over a tracked 10px uppercase label.
- Table (`.table`): columns `SCRIPT / CATEGORY / VER / DL / RATING / STATUS + ACTIONS` at
  `1.5fr 1.2fr .4fr .5fr .5fr 1fr` with a 16px column gap. Script cell shows a 24px icon plus
  the name. Actions cell is right aligned: a status tag (`Published` / `Draft`) then `Edit`
  and `Delete`.
- Footer note: "Editing a published script creates a new version. Old versions stay
  downloadable."

Delete opens a `.dialog` confirm; it must name the script and warn about existing downloads.

---

### 5. Add / edit script (`1f`)

**Purpose:** publish or update a script.

**Layout:** ~820px column, 24px padding, sections separated by 1px rules with a tracked
uppercase label each.

- Header: "New script" (or "Edit <name>") with an autosave indicator, "Draft saved 1 min ago".
- **BASICS** — 76px square dashed icon dropzone on the left; on the right, Name and Short
  description (140 character limit, counter). Below, full-width Full description, markdown,
  ~104px textarea.
- **CLASSIFY** — two rows of three fields: Category (select, from the fixed list), Version,
  Archicad compatibility (multi-select of majors); then Price (Free or amount),
  Accept contributions (yes/no), License (select).
- **FILES AND MEDIA** — full-width dashed dropzone, "Drop the script or add-on file. Zip is
  fine."; then a screenshot strip of 118x72 thumbnails, each removable via a corner `x`, with
  a trailing dashed "add shot" slot; then an optional video URL field.
- **Footer** — left: "Your contact details come from your profile." Right, in order:
  `Save draft`, `Preview`, primary `Publish`.

**Validation:** name, short description, category, version, Archicad compatibility and a file
are required to publish; drafts save with anything. Screenshots max ~2MB each. Video URL must
be YouTube or Vimeo. Show errors inline under the field, never as a summary at the top.

---

### 6. Contributor public profile (`1g`)

**Purpose:** the author's credibility page.

**Layout:** ~820px column.

- Header: 72px round avatar, name 19px, meta line (company, city, website, social links) at
  11.5px muted, a short bio at 12.5px / 1.65 capped at 56ch, and a `Contact` button on the
  right.
- Stat strip: three equal cells — Scripts, Downloads, Avg rating.
- Script grid: two columns, 12px gap, compact cards (28px icon, name 12.5px, meta line
  `Category · v1.4 · 1 214 dl`).
- `RECENT FORUM ACTIVITY` behind a rule: a short list of the author's latest posts and replies.

## Interactions & behaviour

- **Browse filtering and sorting is client-side and instant** in the prototype: picking a
  category filters the grid and updates the count line; the sort chips reorder by newest,
  oldest, rating or downloads. In production, drive both from the URL query
  (`?category=…&sort=…&q=…`) so views are shareable and the back button works.
- Search covers script names, descriptions, authors and thread titles.
- Card, thread row and table row hovers raise the border or tint the background; no motion.
- Screenshot thumbnails swap the hero image in place; clicking the hero opens a lightbox.
- Rating: one vote per user per script, changeable; unauthenticated clicks open sign in and
  resume the action afterwards.
- Posting a comment on a script creates or appends to that script's forum thread. There is one
  underlying thread entity rendered in two places.
- Download increments the counter and, for scripts accepting contributions, may show a
  non-blocking contribute prompt after the file starts.
- Delete is always confirmed in a dialog. Publish and Save draft show a success toast.
- Desktop only for v1; design to a 1280px baseline, no mobile breakpoints required.
- Empty states are needed for: no results in a filtered grid, a contributor with no scripts, a
  script with no comments yet.

## State management

Client state: `category`, `sort`, `query`, `page` (URL-synced); `activeScreenshot` on detail;
draft form values with dirty tracking and autosave on the upload form; auth session and the
current user's contributor profile.

Server data: script list (filterable, sortable, paginated), script detail with media and
aggregate rating, thread list and thread detail, per-user rating, contributor profile,
dashboard aggregates.

## Data model (rough)

- **USER** — full name, company, email, website, social links, avatar.
- **SCRIPT** — name, icon, short description, long description (markdown), category, version,
  Archicad compatibility, price, license, accepts-contributions flag, status (draft or
  published), file(s), timestamps, download count, aggregate rating.
- **VERSION** — script ref, version string, file, changelog, published date. Old versions stay
  downloadable.
- **MEDIA** — script ref, screenshots (ordered), optional video URL.
- **THREAD** — optional script ref, category, title, author, posts, created/last-activity.
- **POST** — thread ref, author, body, optional parent post, helpful count.
- **RATING** — user ref, script ref, 1 to 5 stars.

## Design tokens

Do not read tokens off the wireframe. Take all of them from `design-system/styles.css`:
`--color-*` (including the 100–900 ramps), `--font-heading` / `--font-body`, `--space-*`,
`--radius-*` (all 0), `--shadow-sm/md/lg`. Key values: bg `#f3f2f2`, text `#201e1d`,
accent `#ec3013`, Archivo, radius 0, 2px section dividers.

Note: for paragraph-size text in the accent, use `--color-accent-700` — the pure accent on this
ground only clears 3:1, which is fine for chrome and large text but not body copy.

## Assets

- `assets/tapir-logo.png` — the tapir mark, supplied by the client. Use as the header brand
  mark and favicon source.
- All screenshots, script icons and the reference video in the wireframes are striped
  grayscale placeholders. Real media is uploaded by contributors; no stock imagery is needed.
- Icons: Lucide, per the design system.

## Files

- `design/Tapir Marketplace Wireframes.dc.html` — the seven wireframes (`1a` site map,
  `1b` home, `1c` script detail, `1d` forum, `1e` dashboard, `1f` upload form, `1g` profile).
- `design/support.js` — runtime the reference file needs in order to render. Not part of the
  deliverable.
- `design-system/styles.css` — Modernist tokens and component layer. This is the styling
  source of truth.
- `design-system/readme.md` — Modernist usage guide.
- `assets/tapir-logo.png` — brand mark.
