# ScoreForge Plan

ScoreForge is a React-based sheet music website for browsing, viewing, downloading, uploading, and eventually transforming public domain scores. The first version should focus on making the catalog useful before adding advanced playback and arrangement features.

The project is expected to grow through many feature additions over time, so the layout and code organization should be dynamic, modular, and easy to extend. New tools, viewer actions, catalog controls, upload workflows, playback features, and arrangement features should be addable without rewriting the core app shell.

## Product Vision

The landing page for ScoreForge is the Catalog. Users should immediately see the available public domain scores from `scores.json`, browse the collection, view a selected score, or download the available MusicXML/MXL and PDF files.

The Uploads section is the second main part of the site. It should let users upload their own MusicXML, MXL, or PDF files, then view those uploads through the same score viewer used by the Catalog. Later features can add playback samples, score editing, and custom arrangement creation.

## Core Goals

- Make the Catalog the primary landing experience.
- Display all available scores from `src/data/scores/scores.json`.
- Let users view a selected score in a reusable score viewer.
- Let users download available MusicXML/MXL and PDF files from catalog entries.
- Support user-uploaded MusicXML, MXL, and PDF files in a separate Uploads section.
- Reuse the same score viewer for catalog scores and uploaded scores.
- Keep non-React music, audio, storage, conversion, and utility logic in `src/lib/`.
- Defer playback sampling and arrangement creation until the core catalog/view/upload flow is solid.
- Keep the app structure flexible enough for frequent new features.
- Prefer small feature modules over large all-purpose components.
- Design viewer and catalog actions so new actions can be added without restructuring the UI.

## Extensibility Principles

- Treat Catalog, Uploads, Score Viewer, and Sampler as feature areas with clear boundaries.
- Keep the app shell responsible for navigation and layout, not feature-specific behavior.
- Keep score data in a stable shape so catalog scores, uploads, and future generated arrangements can share viewer logic.
- Prefer composable UI sections, panels, and action menus that can accept new controls over fixed one-off screens.
- Keep feature-specific logic inside its feature folder when it touches UI.
- Keep shared non-React logic in `src/lib/`.
- Avoid coupling future tools directly to the Catalog. Tools should generally operate on an active score passed into the viewer or a shared score state.
- Add new features behind clear interfaces, such as score actions, viewer panels, upload processors, or playback helpers.
- Use naming and folder structure that makes it obvious where a new feature should live.

## Current Structure

```text
src/
  data/
    scores/
      scores.json

  components/
    layout/
    sidebar/
    catalog/
    uploads/
    score-viewer/
    sampler/

  lib/
    musicxml/
    audio/
    storage/
    utils/

scripts/
  build-score-catalog.mjs

MusicData/
  PDMX.csv
  metadata/
  mxl/
  pdf/
```

## Data Pipeline

The `MusicData/PDMX.csv` file is the source of truth for the starter catalog. The utility at `scripts/build-score-catalog.mjs` extracts the fields ScoreForge needs for the first catalog:

- Song name
- Composer
- Genre
- Metadata file path
- MusicXML/MXL file path
- PDF file path

The generated output is `src/data/scores/scores.json`.

Default generation command:

```bash
node scripts/build-score-catalog.mjs
```

Larger catalog generation:

```bash
node scripts/build-score-catalog.mjs --limit 5000
node scripts/build-score-catalog.mjs --limit all
```

## Primary User Flow

1. User lands on ScoreForge and sees the Catalog.
2. User browses, searches, or filters scores.
3. User chooses one of the catalog actions:
   - View score
   - Download MusicXML/MXL
   - Download PDF
4. View score opens the shared score viewer.
5. User can return to the Catalog or switch to Uploads.
6. In Uploads, user adds a MusicXML, MXL, or PDF file.
7. Uploaded files can be opened in the same shared score viewer.

## Phase 1: Project Foundation

- Initialize the React tooling.
- Add package scripts for development, build, linting, and preview.
- Confirm how static score assets from `MusicData/` will be served locally.
- Decide whether `MusicData/` should stay local-only, be copied into `public/`, or be excluded from Git because of size.
- Add a stable score data shape for catalog and upload entries.
- Ensure catalog paths can resolve to files the browser can view or download.

## Phase 2: App Shell And Landing Catalog

- Create the main application layout.
- Add a persistent sidebar or navigation surface.
- Make Catalog the default landing view.
- Add top-level navigation for Catalog and Uploads.
- Keep layout components separate from feature components.
- Avoid adding a marketing-style home page until the core product works.
- Leave room in the layout for future tools, viewer panels, and contextual actions.
- Make navigation easy to extend as new sections are added.

## Phase 3: Catalog

- Load `src/data/scores/scores.json`.
- Display a browsable list or grid of scores.
- Show song name, composer, and genre.
- Add search by song name and composer.
- Add filtering by genre.
- Handle missing composer or genre values gracefully.
- Add clear per-score actions:
  - View
  - Download MusicXML/MXL
  - Download PDF
- Pass selected catalog scores to the reusable score viewer.
- Structure catalog actions so future options can be added cleanly.
- Keep filtering and sorting logic separate from visual display where practical.

## Phase 4: Shared Score Viewer

- Build a reusable viewer component for selected scores.
- Support catalog score entries and uploaded score entries.
- Display PDF files first because PDF viewing is the clearest initial path.
- Provide fallback states for files that cannot be previewed yet.
- Include a score options menu for future actions.
- Keep playback sample controls and arrangement creation out of the first viewer pass unless needed for layout planning.
- Later, evaluate richer MusicXML rendering if PDF viewing is not enough.
- Design the viewer as the main extension point for future score tools.
- Reserve space for future panels such as playback, arrangement generation, metadata, annotations, and export tools.
- Keep viewer state clear enough that tools can be added without duplicating score-selection logic.

## Phase 5: Uploads

- Create an Uploads section separate from the Catalog.
- Allow users to upload MusicXML, MXL, or PDF files.
- Store upload records through `src/lib/storage/`.
- Normalize uploaded score data into a shape close to catalog score entries.
- Reuse the shared score viewer for uploaded files.
- Add upload list management, including selecting an upload and removing it.
- Defer editing, conversion, and arrangement-specific upload workflows until later.
- Treat upload handling as an extensible pipeline so new file processing steps can be added later.

## Phase 6: MusicXML, Playback, And Arrangements

- Add MusicXML/MXL loading helpers in `src/lib/musicxml/`.
- Define audio playback types and helpers in `src/lib/audio/`.
- Keep parsing and playback logic outside React components.
- Build a sampler component that can receive the active score.
- Add playback sample controls to the score viewer when the underlying score format supports it.
- Explore arrangement creation workflows after viewing, uploads, and downloads are stable.

## Phase 7: Polish And Scale

- Improve catalog performance for larger JSON files.
- Add loading, empty, and error states.
- Add responsive layout behavior.
- Add accessibility checks for navigation, controls, upload fields, and viewer interactions.
- Add tests around data parsing, catalog filtering, download URL generation, upload storage, and critical UI flows.
- Revisit component boundaries as features grow, splitting large modules before they become difficult to extend.

## Open Questions

- Should `MusicData/` be committed, ignored, or documented as a local dataset dependency?
- Should score paths in `scores.json` remain relative to `MusicData/`, or should they be transformed into app-served URLs?
- Should catalog downloads link directly to files in `MusicData/`, or should files be copied into a browser-served public asset folder?
- Should the first viewer only preview PDFs, or should it also display MusicXML/MXL in an embedded score renderer?
- For uploads, should files persist only in the current browser, or should they eventually sync to a backend?
- Should playback use generated audio from MusicXML, MIDI files, or both?
