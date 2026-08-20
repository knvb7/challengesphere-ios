# Challenge Fallback Icon Sources

Bundled fallback icons are used only when a challenge has no uploaded cover image.

Each category has four locally generated, vector-style PNG category symbols per category. They intentionally avoid people, avatar, portrait, and AI-character imagery. Runtime selection is deterministic per challenge seed, so challenge cards get visual variety without changing on every render.

The fourth variants were created with OpenAI's built-in image generation using the existing app-owned category covers as style references, then normalized to the same 1200 × 675 PNG format. They use no stock imagery or third-party artwork.

- `coding-1.png`–`coding-4.png`: code bracket, terminal, brace, and database network symbols
- `fitness-1.png`–`fitness-4.png`: dumbbell, shoe, kettlebell, and jump-rope symbols
- `health-1.png`–`health-4.png`: heart/cross, heartbeat, leaf, and wellness-droplet symbols
- `learning-1.png`–`learning-4.png`: open book, graduation cap, notebook, and idea-bulb symbols
- `creativity-1.png`–`creativity-4.png`: palette, pencil, tools, and music symbols
- `productivity-1.png`–`productivity-4.png`: checklist, clock, calendar, and completed-hourglass symbols
- `lifestyle-1.png`–`lifestyle-4.png`: compass, mountains, navigation, and sunrise-path symbols
