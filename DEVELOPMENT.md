# PDF Pumasis: development

Plain scripts, no build step, nothing fetched at play time. `js/engine/` is the DOM-free, deterministic simulation; `js/art/` draws everything in code (ships are traced from small 3D models); `js/sfx.js` synthesises every sound.

## Checks

```
node tools/sim-check.js --seeds 2   # the bot plays every mission; replays and saves must match
node tools/stamp-assets.js          # restamp script and stylesheet URLs after an edit
node tools/make-icons.js            # the icons
```

`tools/preview.html` is the ship sheet; `tools/og.html` draws the share card.
