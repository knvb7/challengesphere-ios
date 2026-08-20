# Genuine App Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing site's fabricated product preview with a curated set of genuine ChallengeSphere app screenshots.

**Architecture:** Copy four source screenshots into a dedicated static asset folder, render the strongest feed screenshot in the hero, and add a three-screen product walkthrough before the feature grid. Keep the existing static HTML/CSS/JavaScript architecture and reveal-motion system.

**Tech Stack:** Semantic HTML5, responsive CSS, vanilla JavaScript, PNG assets.

## Global Constraints

- Preserve each screenshot's native 1080×2400 aspect ratio without cropping its app UI.
- Use only screenshots supplied in `/Users/pranjaldalal/Downloads/attachments`.
- Provide descriptive alt text and responsive layouts at 320px, 768px, 1024px, and 1440px.
- Do not modify the existing analytics or interest-form behavior.

---

### Task 1: Curate and stage genuine product assets

**Files:**
- Create: `website/assets/app-screenshots/challenges-feed.png`
- Create: `website/assets/app-screenshots/discover-challenges.png`
- Create: `website/assets/app-screenshots/create-challenge.png`
- Create: `website/assets/app-screenshots/profile-stats.png`

**Interfaces:**
- Consumes: source PNG files from `/Users/pranjaldalal/Downloads/attachments`.
- Produces: stable relative asset paths consumed by `website/index.html`.

- [ ] **Step 1: Copy the curated screenshots**

  Copy `084143` as `challenges-feed.png`, `084233` as `discover-challenges.png`, `084249` as `create-challenge.png`, and `084808` as `profile-stats.png`.

- [ ] **Step 2: Verify image integrity**

  Run `sips -g pixelWidth -g pixelHeight website/assets/app-screenshots/*.png` and confirm every image is 1080×2400.

### Task 2: Integrate screenshots into the marketing page

**Files:**
- Modify: `website/index.html`
- Modify: `website/styles.css`
- Modify: `website/script.js`

**Interfaces:**
- Consumes: the four stable screenshot paths from Task 1 and the existing `[data-reveal]` animation convention.
- Produces: `.phone-frame`, `.product-showcase`, and `.showcase-card` markup styled responsively.

- [ ] **Step 1: Replace the fabricated hero device**

  Render `challenges-feed.png` inside an accessible phone frame with a small “Real app screen” caption.

- [ ] **Step 2: Add the product walkthrough**

  Insert a showcase containing discovery, challenge creation, and profile stats screenshots before the existing feature grid, each paired with concise feature copy.

- [ ] **Step 3: Add responsive styles**

  Style the phone shells, staggered desktop layout, horizontal tablet rail, and single-column mobile layout while preserving `aspect-ratio: 9 / 20` and `object-fit: contain`.

- [ ] **Step 4: Extend reveal behavior**

  Add the showcase cards to the existing reveal selector list without changing analytics or form logic.

- [ ] **Step 5: Verify static references**

  Parse `website/index.html` and confirm every local image reference resolves to a file.

- [ ] **Step 6: Verify in a browser**

  Serve the repository at port 4173, inspect the page at desktop and mobile widths, and confirm no console errors, clipping, or horizontal overflow.

