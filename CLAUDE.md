# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hortifruti Digital** is a zero-dependency, vanilla JS single-page application that converts raw promotional text (from fruit/vegetable suppliers) into structured, WhatsApp-ready order messages. It runs directly in any browser with no build step.

## Running the App

Open `index.html` in a browser — no server, npm, or build step required.

For local development with a simple server:
```bash
python3 -m http.server 8080
# or
npx serve .
```

There are no tests, no linter, and no CI configuration.

## Architecture

The entire application lives in three files:

- **`index.html`** — markup and layout structure for the 3-step UI
- **`script.js`** — all application logic (~650 lines, no framework)
- **`style.css`** — all styling, CSS custom properties, responsive layout

### Data Flow

```
Raw text (textarea) → Parser → Items array → Rendered checklist → Cart → Order message
```

1. User pastes supplier promotional text into the textarea (Step 1)
2. `parseItems()` in `script.js` extracts product lines using regex into an `items[]` array
3. Items are rendered as checkboxes grouped by category (Step 2)
4. Checked items accumulate in a cart stored in `localStorage`
5. Step 3 renders the cart as a formatted WhatsApp message with totals

### State & Persistence

All state is in `localStorage`. Keys:
- `hortifruti_prefs` — address and payment method
- `hortifruti_cart` — selected items and quantities
- `hortifruti_raw_text` — the last pasted supplier text
- `hortifruti_last_update_ts` / `hortifruti_last_update_source` — metadata for the last import

### Parser Logic (`script.js`)

The parser is regex-heavy and handles messy real-world promotional text:
- Extracts product name, price, unit, and promotion flag per line
- Normalizes units: `kg`, `un`, `bdj`, `pc`, `dz`, `lt`, `cx`, `maço`, `ml` (and variants)
- Detects promotions via asterisks in the source text
- Extracts categories (Frutas, Legumes, Verduras, etc.) from section headers
- Parses Brazilian currency format (`R$ 1,50` → `1.50`)

### Emoji/Icon System

Products are matched to Fluent Emoji 3D icons fetched from `cdn.jsdelivr.net`. There are 60+ keyword-to-emoji mappings. The normalization strips accents and lowercases names before lookup, with category-based fallbacks.

### Order Message Generation

- Delivery fee hardcoded: **R$5.00**
- PIX key (display): `37.223.063/0001-17` / (raw): `37223063000117`
- QR Code generated via `api.qrserver.com`
- Output is WhatsApp-formatted with `*bold*` markers, organized by category

## Key Conventions

- **No modules, no imports** — all code is in a single `<script>` tag / file; functions are global
- **DOM-first** — rendering re-builds DOM nodes on each state change; there is no virtual DOM or reactive system
- **Comments as section markers** — `script.js` uses `// === SECTION NAME ===` style comments to delimit logical areas (Storage, Parser, Rendering, etc.)
- **Brazilian Portuguese** — all user-facing strings, variable names for domain concepts, and comments are in pt-BR
- **CSS variables** for theming — primary green `#16a34a`, accent blue `#2563eb`; change at `:root` level only
