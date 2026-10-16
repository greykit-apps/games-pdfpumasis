# PDF Pumasis

Command a Pumacity Defense Force hydrofoil against the Wolf Empire's navy: a remake of *PHM Pegasus* (Lucasfilm Games, 1987) for the Commodore 64.

**Play:** [greykit.com/games/pdfpumasis/](https://greykit.com/games/pdfpumasis/)

## How it plays

Eight missions off Pumacity's coast, every one open from the start, each scored on its own scale up to its own highest rank: Battle Training, Graduation Exercise, Raider Strike, The Better Part of Valor, Search for the Raiders, Supply Convoy, Surveillance and The Gauntlet.

Your boat is a hydrofoil. Below about 12 knots she runs hullborne; ask for more and she climbs onto her foils and runs at forty-odd. Find contacts on the radar, put them in the glasses, and sink them with the 76mm gun (lead a moving target by the corrector bars) or a missile (Harpoon, Gabriel or Exocet, by boat). Throw chaff at incoming missiles a mile out, running across their path. The operations map sets the autopilot's course and sends the Kestrel helicopters and the ships you escort.

## Classic and Field

**Classic** plays as 1987 did: ships told by their shapes, the gun led by the corrector bars, one autopilot course. **Field** adds modern aids, each of which can be switched on its own: contact labels, a gun-lead mark, a gun-bearing dial, missile warnings, weapon rings, objective marks, fuel range, waypoints, slowing time for news, and a key strip. `L` switches between them at sea.

## Keys

The keys are 1987's, with no function keys: `1`–`5` speed, `0` stop, `,` `.` steer, `Space` Maneuver or Aiming, `6` `7` `8` gun, chaff, missiles, `T` next target, `Enter` fire, `G` the glasses, `V` bridge or map, `R` radar scale, `+` `−` `N` time, `P` pause, `Shift` `Q` end the mission, `L` Classic or Field, `M` sound, `?` help. The arrows are the joystick. A gamepad works too.

## Code

Plain scripts, no build step, nothing fetched at play time. `js/engine/` is the DOM-free, deterministic simulation; `js/art/` draws everything in code (ships are traced from small 3D models); `js/sfx.js` synthesises every sound.

```
node tools/sim-check.js --seeds 2   # the bot plays every mission; replays and saves must match
node tools/stamp-assets.js          # restamp script and stylesheet URLs after an edit
node tools/make-icons.js            # the icons
```

`tools/preview.html` is the ship sheet; `tools/og.html` draws the share card.

## Credits

Built by [greykit.com](https://greykit.com/). *PHM Pegasus* was designed by Noah Falstein and programmed by Larry Holland and Edwin Reich, with art by Ken Macklin and sound by Chris Grigg. This remake is not affiliated with Lucasfilm or Electronic Arts, and uses none of their code, art, sound or text.
