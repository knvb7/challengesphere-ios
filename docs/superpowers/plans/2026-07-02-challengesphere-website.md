# ChallengeSphere Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a beautiful standalone ChallengeSphere marketing/legal website in `website/`, with homepage, privacy policy, account/data deletion page, screenshots, and local verification.

**Architecture:** The website is a static, dependency-free microsite that lives separately from the Expo app under `website/`. It uses shared visual language from the app through handcrafted HTML/CSS and references existing app assets when served from the repository root.

**Tech Stack:** Static HTML5, CSS3, vanilla JavaScript, Python `http.server` for local serving, browser screenshots.

---

## File Structure

- Create `website/index.html`: landing page content, navigation, feature sections, challenge examples, safety/trust section, footer.
- Create `website/privacy-policy.html`: public privacy policy content aligned with the app's current privacy screen and Google Play expectations.
- Create `website/account-deletion.html`: public account/data deletion request page with `mailto:` deletion request CTA.
- Create `website/styles.css`: complete ChallengeSphere visual system, responsive layout, cards, buttons, legal-page styles.
- Create `website/script.js`: current year rendering, smooth anchor scrolling, reduced-motion-friendly reveal effects.
- Create `website/README.md`: local run and verification instructions.
- Create `website/screenshots/.gitkeep`: keeps screenshot folder available in source control; generated screenshots are saved there during verification.

### Task 1: Create website folder and static pages

**Files:**
- Create: `website/index.html`
- Create: `website/privacy-policy.html`
- Create: `website/account-deletion.html`

- [ ] **Step 1: Create homepage HTML**

Create `website/index.html` with a complete static landing page:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChallengeSphere — Turn goals into social challenges</title>
  <meta name="description" content="ChallengeSphere helps friends create private challenges, share submissions, trade glories, and build consistency together.">
  <link rel="icon" href="/assets/images/logo.png">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <main>...</main>
  <script src="./script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create privacy policy HTML**

Create `website/privacy-policy.html` with clearly labeled privacy policy sections for data collection, use, sharing, retention, deletion, choices, security, minors, and contact.

- [ ] **Step 3: Create account deletion HTML**

Create `website/account-deletion.html` with a prominent `mailto:ironside-dev@challengesphere.com?subject=ChallengeSphere%20Account%20Deletion%20Request` CTA and clear deletion process text.

### Task 2: Add visual system and interactions

**Files:**
- Create: `website/styles.css`
- Create: `website/script.js`

- [ ] **Step 1: Add CSS visual system**

Create `website/styles.css` with:

```css
:root {
  --bg: #020204;
  --panel: #0b0b10;
  --panel-strong: #111118;
  --text: #ffffff;
  --muted: #b8b3c4;
  --purple: #4700ec;
  --violet: #7c3aed;
  --emerald: #36d6b8;
  --gold: #ffb84d;
  --blue: #8ee7ff;
  --border: rgba(255, 255, 255, 0.12);
}
```

The CSS must include responsive navigation, hero layout, app preview card, feature cards, challenge cards, legal-page typography, CTAs, and mobile breakpoints.

- [ ] **Step 2: Add JavaScript enhancement**

Create `website/script.js` that:

```js
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
```

### Task 3: Add README and screenshot directory

**Files:**
- Create: `website/README.md`
- Create: `website/screenshots/.gitkeep`

- [ ] **Step 1: Add local run instructions**

Create `website/README.md` explaining:

```markdown
# ChallengeSphere Website

Run locally from the repository root:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/website/`.

Pages:
- `/website/`
- `/website/privacy-policy.html`
- `/website/account-deletion.html`
```

- [ ] **Step 2: Add screenshot directory marker**

Create `website/screenshots/.gitkeep` as an empty file.

### Task 4: Verify and capture screenshots

**Files:**
- Generate: `website/screenshots/homepage.png`
- Generate: `website/screenshots/privacy-policy.png`
- Generate: `website/screenshots/account-deletion.png`

- [ ] **Step 1: Run static file checks**

Run:

```bash
test -f website/index.html
test -f website/privacy-policy.html
test -f website/account-deletion.html
test -f website/styles.css
test -f website/script.js
test -f website/README.md
```

Expected: all commands exit successfully.

- [ ] **Step 2: Run local server**

Run from the repository root:

```bash
python3 -m http.server 4173
```

Expected: server responds on `http://localhost:4173/website/`.

- [ ] **Step 3: Smoke-test HTTP pages**

Run:

```bash
curl -I http://localhost:4173/website/
curl -I http://localhost:4173/website/privacy-policy.html
curl -I http://localhost:4173/website/account-deletion.html
```

Expected: each response starts with `HTTP/1.0 200 OK` or `HTTP/1.1 200 OK`.

- [ ] **Step 4: Capture screenshots**

Use the available browser automation path to capture:

```text
website/screenshots/homepage.png
website/screenshots/privacy-policy.png
website/screenshots/account-deletion.png
```

Expected: each screenshot file exists and is non-empty.

- [ ] **Step 5: Run graphify update if available**

Run:

```bash
command -v graphify && graphify update . || true
```

Expected: graphify updates if installed; otherwise command exits successfully without blocking the website deliverable.

## Self-Review

- Spec coverage: homepage, privacy policy, account/data deletion, separate folder, local run, and screenshots are all covered.
- Placeholder scan: no placeholder implementation tasks remain.
- Type consistency: static file paths and route names are consistent across tasks.
