# Childrex Sequence — complete implementation specification

Version: 1.1 · 11 September 2026

Status: complete version-1 implementation specification with explicit proposed defaults. This is not an assertion that the application is built, tested, deployed, or that proposed behaviors have received separate owner approval.

## 1. Read this first

Build a quick, restrained, browser-based multiplayer Sequence game at `https://childrex.com/sequence`. Follow the active Canvas designs, with the corrections in this document. Use Avataaars for profiles. Support humans and simple computer opponents. Deploy to the existing Hetzner server, independently of the other applications there.

This document is intended to remove implementation guesswork. “Must” requirements are acceptance criteria for the specified version. **Owner decision** means explicitly requested behavior; **reference value** means measured from Canvas; **proposed default** means a fully specified recommendation for behavior the owner has not explicitly chosen. Unspecified product behavior in §§3–20 is a proposed default, not another owner decision. The decision register in §23 makes the distinction explicit. Do not use a proposed default as permission to redesign Canvas or expand deployment authority. The owner can change a default without needing to reconstruct the rest of the plan.

Reading order: §§1–2 and §23 (scope/authority), §§3–14 (product/game behavior), §§24–28 (exact sound, motion, UI states, tokens, and edge-case closures), §§15–18 and §29 (implementation/operations), then §§20 and 30 (tests and handoff). Detailed values in §§24–29 refine the corresponding earlier sections; they do not authorize new features.

Quick navigation:

- [Scope and decisions](#1-read-this-first) · [Canvas references](#2-design-source-of-truth) · [Decision register](#23-decision-register--what-is-approved-versus-proposed)
- [Profiles](#4-guest-identity-avatars-and-names) · [Lobby](#5-lobby-interactions-and-permissions) · [Invites/join](#6-invites-join-and-switching-rooms) · [Board interactions](#7-board-hand-and-turn-interactions)
- [Rules](#8-rules-baseline-and-digital-adaptations) · [Exact board](#9-exact-board-and-card-representation) · [Engine](#10-engine-algorithms-and-invariants) · [Computers](#11-computer-opponents)
- [Menus/results/replay](#12-menus-overlays-results-and-replay) · [Connection recovery](#14-connection-lifecycle-host-migration-and-seat-control)
- [Exact sounds](#24-complete-sound-contract) · [Exact transitions](#25-complete-animation-and-transition-contract) · [Interaction state details](#26-complete-interactionstate-closures) · [Tokens/assets](#27-consolidated-visual-tokens-and-asset-manifest)
- [Architecture](#15-implementation-architecture-and-repository-structure) · [API](#16-api-and-command-contract) · [Protocol edge cases](#28-gameprotocol-edge-case-closure) · [Deployment](#18-deployment-and-cicd-runbook)
- [Implementation order](#19-implementation-order-and-deliverables) · [Acceptance tests](#20-acceptance-tests--required-checklist) · [Delivery details](#29-concrete-delivery-contracts-and-operational-configuration) · [Final checks](#30-final-verification-matrix-and-plan-handoff)

Priority when references conflict:

1. Later explicit owner decisions.
2. The behavioral and correctness requirements in this specification.
3. Active Canvas frames for visual appearance.
4. Reference photographs for board appearance only.
5. Archived frames: reference only, never implementation requirements.

Do not use a screenshot as the functioning UI. Do not infer working interactions from static Canvas nodes. Implement real components, real controls, and server-validated actions.

### 1.1 Confirmed owner decisions

- Horizontal board; full-width top and bottom bars; centered board and hand.
- Minimal, snappy animations. No excessive effects.
- Resting board cards have no added borders.
- Selected cards use the same shape and corner geometry as resting cards, with a thin colored outline—not a thicker frame or enlarged radius.
- Selected hand card rises slightly. Its outline uses the raw team color; valid board placements use a light version of that color.
- Last move remains identifiable. Completed sequences remain identifiable.
- Completing a non-winning sequence does not suppress the next player's turn indication.
- A single Menu button replaces the header's multiple icon buttons.
- Avataaars, not Lorelei or Bottts.
- Tap your avatar to choose another. Double-tap/double-click your name to edit it inline.
- Player details tooltip is triggered by hovering the player card, not just its text.
- Invite badge copies the invite. Bottom lobby button joins another game by code.
- Third-team add control overlaps the existing team panels; it does not reserve a third column before activation.
- Replay does not require everyone to confirm.
- Computer players are in scope; sophisticated machine learning is not required.
- New repository under personal account `EmmanuelPenkra`; CI/CD; Hetzner with a self-hosted runner.
- Homepage at `/` may be a minimal placeholder with a Sequence link.

### 1.2 Proposed defaults and implementation constraints

| Area | Default for version 1 |
| --- | --- |
| Identity | Guest profiles; no login, email, password, or account registration |
| Repository | Private `EmmanuelPenkra/childrex-sequence`; check availability before creating |
| Room access | Invite link or the approved two-digit code; no public room directory |
| Team sizes | Equal sizes required at start; computers count as players |
| Human turn timer | None while connected |
| Computer difficulty | One basic heuristic difficulty |
| Replay authority | Any connected human participant can replay a finished round |
| Mid-round arrivals | No new seats; existing participants can reconnect |
| Spectators | Not included |
| Host powers | Lobby configuration, moving lobby players, removing computers, starting |
| Mid-round player departure | Computer takes over that seat; remaining players keep playing |
| Audio | Off initially; opt in from Menu |
| Motion | On unless reduced motion is requested by OS/browser |
| Room expiry | 24 hours without a human connection or accepted human command; background bot moves do not extend it |
| Profile retention | Same browser guest session up to 30 days of inactivity |

### 1.3 Not included

No accounts, chat, voice, public matchmaking, ranked play, leaderboards, payments, ads, custom card uploads, custom board editors, alternate game modes, adjustable timers, undo after a committed move, spectators, native apps, or full replay-history viewer. Operational move events are stored for recovery/debugging; that is not a user-facing replay viewer.

## 2. Design source of truth

Canvas document: `286e0c58-8a0e-42c9-8d79-bc3d609ad921`, **Sequence — Game UI**. Initial inspection at sequence 2961; read-only alignment audit at sequence 2973 after corrections. Re-read before implementation because the owner may continue editing. No further Canvas edits were made during the final specification pass.

### 2.1 Active frame map

| Frame ID | Implement as |
| --- | --- |
| `route-a` | Game, resting hand/board |
| `route-a-copy-1` | Local card selected, valid placements highlighted |
| `route-a-copy-182` | Another player's turn, last move visible |
| `route-a-copy-2` | Non-winning sequence completed, next turn continues |
| `route-a-copy-1-copy-1` | Long names, player-card tooltip; extend for larger rosters |
| `m3-lobby-copy-1` | Lobby with neutral/unselected team colors |
| `m3-lobby` | Two-team lobby |
| `m3-lobby-copy-2` | Balanced two-team lobby, ready to start |
| `m3b-lobby` | Three-team lobby |
| `m3-join-route` | Code-entry/join view |
| `route-a-copy-3-copy-1` | In-game Menu popover |
| `route-a-copy-2-copy-417-copy-1` | Two-team winner/result presentation |
| `route-a-copy-2-copy-417-copy-1-copy-1` | Three-team winner/result presentation |
| `route-a-copy-2-copy-417-copy-1-copy-2` | Losing participant's result presentation |
| `avatar-study-avataaars` | Chosen avatar style, not an application screen |
| `asset-library-cards` | SVG asset source, not a route |

These are variants of shared components, not independently coded pages. Do not copy the board markup once per state.

### 2.2 Archived and excluded

Everything inside `sequence-archived` is excluded. Specifically:

- `m3-join-alt`
- `m4-lobby`
- `m4b-lobby`
- `route-a-copy-3-copy-227`
- `route-a-copy-3-copy-227-copy-1`
- `route-a-copy-3-copy-227-copy-2`
- `route-a-copy-1-copy-2`

Previously removed directions (`route-b`, `m2-lobby`, `m2-join-route`) are also excluded. Do not restore them.

### 2.3 Resolved discrepancies and fidelity safeguards

1. Three-team footer copy was corrected in Canvas. Keep both variants consistent: badge copies invite; footer says **Join another game with code**; no redundant join link.
2. Preserve the approved two-digit code presentation (`47` in fixtures) and `CODE` badge label. Clicking the badge copies the invite; that behavior does not require changing the visible label. Do not expand code length or redesign code entry without owner approval.
3. Four-player fixtures were corrected to six cards; the six-player winner uses five. Always deal the rules-based number rather than copying a fixed screenshot hand.
4. Demo names and chips are fixtures, never initial production game state.
5. Truncated names such as `Amarachi Okon…` are visual examples. Store the full name and let CSS truncate it.
6. A tooltip shown in a demonstration frame must not stay visible at rest.
7. Some winner exports omit title text on a first render. Inspect both saved text nodes and a fresh render. Do not implement an empty results title because a cold export missed a font.
8. Winning bands were shortened to emphasize exact five-cell groups. Actual scoring/protection still comes from stored sequence records, never the band's dimensions.
9. Active initial-letter placeholders were replaced with Avataaars, retaining geometry/team indicators. Additional avatar options are specified in §27.3.
10. Do not carry over any old replay-voting UI or persistent “Wild” label below the hand.

### 2.4 Visual tokens and geometry

At the 1280 × 1040 reference viewport:

- Top bar: `x=0,y=0,width=1280,height=88`, background `#1B1E24`.
- Board: `x=141,y=108,width=998,height=800`, background `#C3C7CC`.
- Bottom hand bar: `x=0,y=928,width=1280,height=112`, background `#1B1E24`.
- There is 20 px between top bar and board, and 20 px between board and hand bar.
- Board/card-area gaps and decorative strips must scale together, maintaining the board's 998:800 outer ratio.
- Hand card reference size: 62 × 87.07 px; row gap 12 px; horizontally centered.
- Board portrait artwork is turned 90° within landscape cells, matching the approved board. Hand artwork stays upright.
- Preserve the small horizontal inset now present on the board; do not restore large side strips after rotation.
- Brand: `SEQUENCE`, Jost, 28 px at reference size, weight 400, letter spacing −1.3 px, color `#E9EAEE`; same treatment in lobby/join/game.
- Team blue: `#2F6BFF`. Gold status indicator: `#F5C451`.
- Team red: `#E5484D`; team green: `#30A46C`; completion outline: `#36B87A`, matching the inspected completed-sequence card. Completion green is a separate status token, not the green team's identity.
- §27 supplies the consolidated tokens and fallback geometry. Keep them in one `tokens.css`; do not scatter values across files. Only replace a reference value when a newer owner-approved Canvas revision changes it.

Typography, button heights, capsule alignment, and corner rounding must be compared with the real frames at 100% zoom. Every caption is centered on both axes in its capsule. Board strips contain one centered SEQUENCE word each, not accidentally duplicated text.

## 3. URLs, entry, and navigation

| URL | Behavior |
| --- | --- |
| `/` | Static Childrex placeholder, one clear Sequence link |
| `/sequence` | Redirect to `/sequence/` |
| `/sequence/` | Restore the visitor's last active room, or create/open their new lobby |
| `/sequence/join` | Code entry without abandoning an existing room |
| `/sequence/join?code=47` | Prefill code and look up room; user still clicks Join |
| `/sequence/room/:roomId` | Room shell; render lobby, active game, or result from server phase |
| `/sequence/credits` | Asset/software credits and third-party notices |

`roomId` is an opaque UUID, not the code. A room URL alone grants no seat or private-hand access. A nonmember visiting it sees Join via invite/code, not room internals.

On first entry, obtain a guest session, then create a lobby using an idempotent POST. Never mutate state in an HTTP GET handler. Guard the client initialization using one persisted creation-request UUID so Strict Mode, refreshes, and network retries cannot create duplicate rooms. If a room is saved locally, attempt resume first; only create after the server confirms it is missing/expired or the user chooses New game.

Creating a lobby makes the visitor host and places them in team A. Team A and B exist; both start with no selected color. Other seats are empty. Do not auto-add opponents or start a game. The host can invite humans or add a computer to play alone against it.

Browser Back closes a routed join/new-game view and returns to the room without leaving it. A close button on the join/new-game overlay does the same. Closing the browser is a disconnect, not an explicit Leave command.

## 4. Guest identity, avatars, and names

### 4.1 Guest identity

- Server creates an opaque guest ID and a random session credential stored in an HttpOnly, Secure, SameSite=Lax cookie scoped to `/sequence/`.
- Do not use a display name, avatar seed, socket ID, or room code as authentication.
- Default name is `Player N`, where N is a short random suffix; room display may label the local participant `You` with their name available in details.
- Store name/avatar on the server guest record. Local storage can cache presentation preferences and last room ID; it must not contain other players' hands or an authentication credential.
- Persist guest session for 30 days of inactivity. Clearing cookies creates a new guest and does not grant the former seat.
- Names need not be unique. Distinguish identical names by avatars and seat/You markers.

### 4.2 Avatar picker

Trigger: click/tap **your own avatar** in lobby or game header. Keyboard: focus its button, Enter/Space. Clicking someone else's avatar opens their read-only details; it does not edit them.

1. Open a compact anchored popover; use a dialog sheet on narrow screens.
2. Heading: **Choose your avatar**. Display 24 curated Avataaars options in a 6-column desktop / 4-column phone grid.
3. Each option is a real button, with a checked indication for the current choice. Use a visible focus ring and accessible labels such as `Avatar 7`.
4. Selecting an option updates the local preview immediately, sends `profile.update`, and closes on success. Other participants receive the updated profile.
5. Failure restores the old avatar and shows `Couldn’t update avatar. Try again.` Keep the picker open for retry if it is still open; if the user already dismissed it, show a toast without reopening it.
6. Escape/outside click/close cancels without changing selection. Restore focus to the triggering avatar.

Open with focus on the current option. Use one roving tab stop inside the grid: left/right move one option, up/down move one row (six options desktop, four phone), Home/End move to first/last option, Enter/Space selects. Clamp at the grid ends. Include a footer **Edit name** action; it closes the picker and opens the same inline name editor, providing the touch/keyboard alternative without another account screen. Tab exits the grid to that footer/close control; modal presentation keeps focus inside the dialog.

Use a committed allowlist of 24 SVG files and IDs `avataaars-01`…`avataaars-24`, generated at build/preparation time with a pinned DiceBear version. Keep the already-approved examples among the options. There is no runtime dependency on the public DiceBear API. No uploads, arbitrary SVG strings, external URLs, or full facial-feature editor in version 1.

Avataaars style licensing is distinct from DiceBear's software license; retain both in notices. The style is identified as Avataaars by Pablo Stanley in [DiceBear's style documentation](https://www.dicebear.com/styles/avataaars/).

### 4.3 Inline name editing

- Double-click desktop / double-tap touch on your name enters an inline text input, keeping the row/card dimensions stable.
- Touch double-tap recognition: two released taps within 300 ms, centers within 12 CSS px, neither moving more than 8 px. A single name tap does not trigger a team move or delayed alternate action. On desktop use native double-click; keyboard Enter/F2 remains available.
- The first tap on the name must not move you to another team. Avatar/name zones do not bubble to the team-move click handler.
- Keyboard alternative: focus name, Enter or F2. Touch alternative: Edit name in your profile popover, so double-tap is not the only path.
- Prefill the actual stored name, not `You`; select its text.
- Validation: trim outer whitespace; collapse repeated spaces; normalize Unicode NFC; 1–24 grapheme clusters; reject line breaks/control characters; render as text only. Support accented/non-Latin names and emoji.
- Enter saves. Blur saves if valid. Escape restores the previous name. Do not save on Enter during IME composition.
- Empty/too-long input remains editable with a short inline error; do not replace a valid previous name with invalid content.
- During a save, retain focus as appropriate and prevent duplicate submissions. On failure retain the draft with Retry/Escape options.
- Broadcast the accepted name to room participants without changing their identity, team, or seat.
- Only the owner may edit a human profile; host status does not grant rename privileges.

## 5. Lobby interactions and permissions

### 5.1 Layout

Use the neutral, two-team, and three-team frames as states of one `Lobby` component. Header includes brand, close/back where relevant, title, dynamic team/rules subtitle, and invite badge. Panels contain team heading, color control, player rows, Add computer, Invite a friend. Footer contains Join another game with code and Start game.

Each panel has a stable team ID; color is a property, not its identity. Changing BLUE to GREEN does not remove/re-add its players.

Unselected color: transparent panel, subtle light 1 px border, **SELECT COLOR** heading. It is not a gray filled version of a selected team. Start remains disabled until every active team has a distinct color.

### 5.2 Permission table

| Action | Host | Other human | Computer |
| --- | --- | --- | --- |
| Edit own name/avatar | Yes | Yes | No |
| Copy invite | Yes | Yes | No |
| Move self between teams in lobby | Yes | Yes | No |
| Move another lobby player | Yes | No | No |
| Select/change team colors | Yes | No | No |
| Add/remove computer | Yes | No | No |
| Add/remove third team | Yes | No | No |
| Start round | Yes | No | No |
| Replay finished round | Yes | Yes | No |
| Leave | Yes | Yes | N/A |

Server enforces all permissions. Hiding or disabling a button is not authorization.

### 5.3 Team movement

- Click a player row's non-profile area: with two teams, move to the other team; with three, move to the next panel in visual order, wrapping at the end.
- Only self/host-authorized rows are interactive; other rows remain read-only for non-hosts.
- Moving appends the player to the destination team's roster; that order determines their within-team turn position.
- Use stable React keys, a 140 ms movement transition, and preserve focus.
- Team capacity is six with two teams, four with three teams. Reject a move into a full team and display `That team is full.`
- Temporary imbalance is allowed while arranging the lobby; Start explains how to fix it.
- No team movement, color changes, or roster edits after a round starts.

### 5.4 Colors

- Available colors are blue, red, and green. No two active teams can share a color.
- In a neutral panel, the host chooses from currently available color swatches.
- In a selected two-team panel, the small circular control shows the unused third color. Clicking switches directly to it, matching the owner's request. The previously used color becomes available.
- With three selected teams there is no unused color; hide the change affordance, retaining the heading's alignment. Do not implement silent swapping of other teams.
- Non-hosts see the selected colors but no active change control.
- Color controls have labels such as `Change Blue team to Green` and a 44 px interaction area, even if their visible circle is smaller.

### 5.5 Third team

- Two-team state shows the centered plus with its faint outlined ring; it overlaps both panels. No visible Add team pill label.
- Keep the existing normal panel gutter. Position plus independently at the shared boundary; do not enlarge that gutter to fit it.
- Accessible label and hover tooltip: `Add third team`.
- Host click adds an empty middle team. If exactly one color is unused, assign that color; otherwise leave it unselected.
- Existing players stay with their teams. Reflow to three equal panels over 140 ms; update target sequence count immediately.
- If either existing team exceeds four players, disable add-third-team and explain `Move or remove players until each team has at most 4.` Do not silently redistribute people.
- Remove team is available to host for the added team. If it is empty, remove immediately. If it has players, show a confirmation explaining that they will move to the other teams.
- On confirmation, distribute its players in roster order to the currently smaller remaining team, ties leftmost; preserve human/computer identity. Total remains ≤12 and each remaining team ≤6. Update rules subtitle.

### 5.6 Computers

- Add computer immediately appends a computer to that panel after server acknowledgement.
- Default visible names: `Computer 1`, `Computer 2`, etc., with a small `Computer` subtitle and an Avataaars avatar. Do not use Bottts artwork.
- Computers have no ready checkbox. Their turn is automatic after start.
- Host can move them like other rows and remove them through a small contextual Remove computer action. Removing one in lobby needs no confirmation.
- Hide Add computer at capacity. Server rejects duplicate rapid requests through command IDs and capacity validation.

### 5.7 Start eligibility

Start is host-only and enabled only when:

1. There are exactly two or three teams.
2. Every team has one selected, unique color.
3. Every team has the same number of players and at least one player.
4. Total roster is within the supported counts in §8.
5. All human seats are connected; disconnected lobby seats must reconnect, be removed after expiry, or leave.
6. At least one human remains in the room.
7. No configuration command is still pending.

No ready system. Show one actionable disabled reason near the button, in priority order: select colors → populate teams → balance teams → reconnect players. Example: `Add 1 player or computer to Red to balance teams.`

Non-host button label is `Waiting for host`; no clickable Start. On start request, label `Starting…`, disable duplicate action, then navigate everyone to the shared game state on success. Errors keep the lobby intact.

## 6. Invites, join, and switching rooms

### 6.1 Codes and invite badge

- Generate two numeric digits with a cryptographic generator, including leading zeros (`00`–`99`). Store/display as a string. This provides only 100 simultaneous code allocations; never silently lengthen codes when exhausted.
- Allocate using a database unique constraint among live rooms; retry collisions. Do not rely on checking availability then inserting without a constraint.
- Badge: `CODE` above the large two-digit code, preserving the approved 56 px number typography and ring. Never replace the resting label with `COPY INVITE`.
- Clicking copies `https://childrex.com/sequence/join?code=47&room=<roomId>` and shows a separate `Invite copied` toast for 1.5 seconds without changing the badge label or dimensions. The invisible room-ID parameter prevents a reused short code from sending an old invite to a different room; it is not a longer displayed code or a secret.
- If Clipboard API fails, display a selectable URL and Copy retry control. Do not falsely report success.
- Invite a friend inside a team copies the same link plus `team=<stableTeamId>`. The requested team is a preference, not a promise; enforce capacity on join.
- Do not reveal any hands or permit room commands based on a code alone. Joining creates authenticated membership.
- Two-digit codes are easy to guess; rate limiting reduces abuse but does not make them secret. This version is an invite-oriented casual game, not a confidential room system. If stronger room privacy or more simultaneous allocations are required, raise that requirement with the owner before changing the approved interaction.

### 6.2 Code-entry screen

- Reuse `m3-join-route` styling and centered title. Remove any accidental duplicate title nodes.
- Use one real input, visually presented as the two large slightly angled playing cards in Canvas. Do not implement two competing form fields. Use numeric input mode, not `type=number` (leading zeros matter).
- Accept paste of two digits, spaces/hyphens, or a valid Childrex invite URL. Strip allowed separators; reject arbitrary malformed URLs and extra characters.
- Keep the large card-inspired rank typography and suit decoration. Decorations are aria-hidden.
- Once two digits are present, perform a debounced 300 ms lookup. Show `Checking game…`, then `Game found · N players waiting`, `Game not found`, `Game is full`, or `Game already started`.
- A successful lookup is only a preview; Join revalidates everything atomically. With an invite's `room` parameter, code and room ID must both match; otherwise return `This invite has expired.` Do not fall back to a different room using that code. Manual two-digit entry uses the current allocation.
- Name field uses the guest name and the same validation rules; avatar opens the same picker.
- Join button is enabled only for a valid name and joinable result; Enter submits. While pending label `Joining…`.
- Join appends to preferred team if available, otherwise the smallest team with capacity, ties visual order. Tell the user if their preferred team was unavailable.
- Do not auto-start when a room becomes full/balanced.
- Existing members entering their own room's code resume instead of consuming another seat.
- Joining a game in progress is rejected for new members, but a still-authorized returning participant resumes their original seat.

### 6.3 Switching rooms / New game

The bottom lobby action opens Join without immediately leaving. If joining succeeds, atomically release the previous room membership and acquire the new one. A failed join leaves the old seat unchanged.

In-game Menu → New game opens the active lobby design as a full-screen dialog/wizard, not the archived white modal. Explain `Creating another game leaves this one.` Buttons: **Create game** and **Cancel**. Creating replaces the person's seat in an active old round with a computer; it does not reset everyone else's round. Other players remain where they are. In a lobby, switching simply removes the old seat.

To be precise, the first step is a confirmation using the existing dark dialog styling; it does not edit a second live lobby in the background. After Create game succeeds, navigate to the normal active lobby layout in the newly created room. Do not maintain speculative second-room members before confirmation.

New game on the result screen follows the same create-new-room path. Replay is the separate same-room action.

Implementation: one transactional `room.switch` operation validates the destination/create configuration before leaving the source. Lock both room actors in sorted room-ID order; never leave first and hope join succeeds.

## 7. Board, hand, and turn interactions

### 7.1 Board component

- One 10 × 10 board driven by the constant in §9. No randomly shuffled board.
- Each cell has a stable logical ID, card face, optional chip, zero or more sequence memberships, and optional last-move state.
- Treat free corners as permanent shared symbols, not occupied blue cells. Use the approved four-suit medallion drawn as vector artwork, not a blurry crop of the reference photo.
- Use native DOM/CSS controls and retained SVG card assets; no need for an HTML canvas game engine.
- Use an SVG image for card artwork (`<img src>` is sufficient); independent UI layers draw chips, outlines, and status. Do not convert all court-card artwork to editable vector nodes.
- Position chip center exactly at cell center. It must not shift when an outline appears.

### 7.2 At rest

- Board cards: no added stroke, shadow frame, or selection border.
- Hand: faint neutral outline as in the approved resting card; never a thick surrounding frame.
- Header current-player card: gold indicator and `Your turn` / `Their turn` wording.
- Next participant subtitle: `Up next`.
- Hand has no separate Your cards heading or permanent Wild strip.
- Display the last committed move until another board-changing move is accepted; it is not cleared by opening a menu, swapping a dead card, or selecting a hand card.

### 7.3 Selecting and playing a normal card

1. During your turn, click/tap a hand card: select that specific card instance locally.
2. Lift its artwork 6 px without changing hand-bar height or neighboring positions. Outline uses the local team's raw color, 1 px at reference scale.
3. Highlight only currently legal empty matching board cells with a light team-colored thin inset outline. Blue default is `#92B5FF`.
4. Clicking the selected hand card again deselects. Clicking another selects the other. Clicking the empty board background or Escape deselects. Do not deselect merely because the pointer moves away.
5. Clicking/tapping a highlighted board cell commits immediately; there is no extra Confirm button in desktop/normal touch mode.
6. Send `round.play` with the exact card instance ID and logical cell coordinate; disable further play while the request is pending.
7. On server acknowledgement/snapshot, show the chip, remove the played card from the hand, show replacement, clear selection, update last move and next turn.
8. Do not send selection previews to other players, including teammates. Selection reveals private strategy.

Board click without a selected hand card does not automatically choose a card. Display the local helper `Select a card from your hand first` for 1.5 seconds. Invalid cell click does not consume anything; if a card is selected show `Choose a highlighted space`.

### 7.4 Duplicate hand cards

Two identical faces are distinct `cardInstanceId`s. Selecting one must not lift both. A play consumes only the chosen instance. Keep remaining cards in their existing order and append a drawn card at the end; do not sort/rearrange the hand on every draw.

### 7.5 Jack interactions

- A selected placement Jack highlights every legal empty noncorner cell.
- A selected removal Jack highlights eligible opponent-chip cells with the acting team's light outline plus a small minus/removal mark, so it cannot be confused with placement.
- Context helper appears only while the Jack is selected: `Place on any highlighted space` or `Remove a highlighted opponent chip`.
- No valid targets: selected Jack may stay selected to explain why, but do not enable a play or offer ordinary dead-card replacement for it.
- A successful removal shows the chip disappearing, leaves the card artwork in place, and puts the last-move marker at the now-empty cell. It does not place a new chip there.

### 7.6 Dead-card replacement and inability to act

On your turn, eligible ordinary cards show a discreet Dead badge. Selecting one shows a small **Replace card** action above the hand; no board targets. Confirming it sends `round.exchangeDeadCard`. The replacement appears in the same hand slot; the player still has their board action. Only one exchange allowance exists per turn. If the replacement is also dead, the allowance does not reset.

When no board action exists and an exchange is available, show `Replace a dead card to continue`. After the allowance is exhausted—or when only unusable Jacks remain—show **Pass — no legal moves**. This is an explicit digital fallback, not an opportunity to skip strategically. Server allows Pass only if no board action exists and no unused legal dead-card exchange remains.

On a pass, keep the most recent board move visible and advance turn. Stalemate handling is specified in §10; a full board alone is not automatically a draw because removal may still be possible.

### 7.7 Thin outline implementation: critical regression requirement

Do not use a 4–6 px CSS border, an outer box-shadow ring, padding around a shrunken image, or a second rounded rectangle with a larger radius.

Use a fixed-geometry shell with one radius token. Artwork is clipped by that shell. Its overlay is `position:absolute; inset:0; border:1px solid var(--state-color); border-radius:inherit; box-sizing:border-box; pointer-events:none`. Reserve no layout space for it. A wrapper's size does not change with state. For rotated board art, draw the outline on the unrotated landscape cell shell, not the rotated `<img>`.

At reference size, board corner radius is approximately 2.08 px inherited from the artwork mask; hand shape must be derived from the existing SVG/viewBox and matched at the shell edge. Scale consistently. If an SVG includes internal white padding, fix its viewBox/asset mask explicitly after visual comparison; do not conceal the mismatch with thicker borders.

Acceptance: overlay selected/resting screenshots at 400% zoom. Outside silhouette and corner tangents must coincide. The only differences are color and the selected hand's 6 px vertical lift. Verify on blue, red, and green, with DPR 1 and 2.

### 7.8 Last move and completed sequences

- Last placement: gold ring around its chip plus a small last-move dot/marker. Header tooltip includes actor and action.
- Last removal: gold dashed ring at the empty cell center with a minus symbol; no fake chip left behind.
- Gold status persists until the next placement/removal, including across reconnects.
- Completed sequence: all five exact cells get thin completion-green inset outlines; their chips keep their team's color. Add a subtle lock/check cue and accessible text.
- Gold last-move marker is on the chip/center; green completion is on the card perimeter, so both can coexist without contradictory borders.
- Non-winning completion: brief `Sequence made` notice; hand state and header immediately reflect the next player's turn. Do not wait for a toast to finish before accepting the next player's input.
- Winning completion switches to results instead of advancing an actionable turn.

### 7.9 Opponent turn and tooltips

- Keep your hand visible at opacity 0.78; do not heavily black it out. Disable play/selection while another player acts.
- Show current participant and next participant derived from the actual seat order, never sample names. Example order: You → Diego → Amara → Priya.
- Hover anywhere on a player card for 350 ms opens `b2-tip`-style details: full name, team, current/next/disconnected/computer status, and their last publicly played card/action if any. Never show their hand.
- Tooltip closes after 100 ms on pointer exit; remains open while hovered; closes on Escape. Clamp to viewport and avoid covering important card targets.
- Keyboard focus opens equivalent details. On touch, tapping a nonlocal card opens details; a second tap/outside tap closes. Own avatar/name retain edit interactions.
- Name width is constrained, using `min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`. Full name remains in accessible text/details.
- With many players, header roster scrolls horizontally within its allocated width. Keep brand/Menu fixed and auto-scroll current player into view only when turn changes. Never switch to the archived avatar-stack design.

## 8. Rules baseline and digital adaptations

### 8.1 Rules summary

Use two 52-card decks, no jokers. Teams are equal and turns alternate teams. Hand sizes: 2 players → 7; 3/4 → 6; 6 → 5; 8/9 → 4; 10/12 → 3. Two teams need two sequences; three teams need one. A sequence is five aligned spaces horizontally, vertically, or diagonally; shared corners are free. Ordinary cards use an empty matching space. Two-eyed Jacks place anywhere empty; one-eyed Jacks remove an opponent's unprotected chip. Removal ends that action. Completed sequences are protected. One occupied ordinary-card pair permits one dead-card exchange before the normal action. Recycle discards when the draw pile empties. Two sequences may overlap by one space.

Baseline checked against the [Sequence instruction booklet, mirrored PDF](https://sl-web.site/resources/pdf/instructionsSequence.pdf). The publisher's product page also identifies the two-deck game and player range: [Goliath Sequence](https://www.goliathgames.us/product/sequence/).

### 8.2 Explicit digital adaptations

These implementation policies are deliberate and must be explained in How to play where relevant:

- Automatic replacement draw: no manual Draw button or penalty for forgetting to draw.
- Automatic sequence recognition: no need to announce/click “claim”.
- Virtual team chips are unlimited; physical box inventory is not a gameplay limit.
- Blue/red is permitted for two teams, following approved UI; color has no strategic effect.
- Dealer is chosen randomly once by the server; starting seat is the next seat. Replay advances dealer by one seat.
- No table-talk enforcement; there is no in-app chat/coaching system.
- Deterministic handling of ambiguous long runs (§10), forced pass, and digital draw fallback.
- Disconnect recovery/computer replacement (§14).

The only legal total/team-count combinations are: two teams with 2,4,6,8,10,12 players; three teams with 3,6,9,12 players. A human plus one computer is a two-player game. Never start five humans as unequal teams; add computers or rearrange first.

## 9. Exact board and card representation

Use `T` for ten, `A,K,Q,J` for face ranks, and `S,H,D,C` for suits. Card faces are strings such as `9H`, `TC`. Card instances are unique across both decks, e.g. `d0-9H`, `d1-9H`.

This is the logical board transcribed from the active Canvas node names. `F` means free corner. Logical row/column correspond to the first/second number in `a3-cell-r-c`, not the displayed horizontal arrangement.

```text
       c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
r0      F 2S 3S 4S 5S 6S 7S 8S 9S  F
r1     6C 5C 4C 3C 2C AH KH QH TH TS
r2     7C AS 2D 3D 4D 5D 6D 7D 9H QS
r3     8C KS 6C 5C 4C 3C 2C 8D 8H KS
r4     9C QS 7C 6H 5H 4H AH 9D 7H AS
r5     TC TS 8C 7H 2H 3H KH TD 6H 2D
r6     QC 9S 9C 8H 9H TH QH QD 5H 3D
r7     KC 8S TC QC KC AC AD KD 4H 4D
r8     AC 7S 6S 5S 4S 3S 2S 2H 3H 5D
r9      F AD KD QD TD 9D 8D 7D 6D  F
```

Display transformation matching the current horizontal board:

```ts
displayRow = logicalColumn;
displayColumn = 9 - logicalRow;
logicalRow = 9 - displayColumn;
logicalColumn = displayRow;
```

Thus Canvas `a3-cell-6-4` maps to displayed row 4, column 3; its card is 9H. Its other 9H target, `a3-cell-2-8`, maps to displayed row 8, column 7. Store and send logical coordinates everywhere. Only the Board component converts to display coordinates. Keyboard navigation uses display coordinates before converting back.

Automated board-constant checks: exactly 100 cells; exactly four F corners; 48 non-Jack faces each occurring twice; no Jacks/jokers; transform round-trip on all 100 coordinates. Changes to this constant require a board-version bump; saved rounds keep their version.

Deck creation: enumerate 52 faces twice; shuffle using server cryptographic randomness and Fisher–Yates. Deal in turn-order rounds. Never expose seed or undealt order to clients. The bot receives no special access.

Jack face mapping: `JC/JD` are placement; `JH/JS` are removal. Add explicit tests and readable helper labels; do not determine behavior by pixel analysis of the artwork.

## 10. Engine algorithms and invariants

Implement a pure TypeScript rules package. No React, database, sockets, timers, HTTP calls, or system clock calls inside its rule functions. Pass randomness/timestamps through parameters as needed for reproducible tests.

### 10.1 Public entry points

```ts
createRound(config, roster, deckOrder, roundId): RoundState
legalActions(state, seatId): LegalAction[]
isDeadCard(state, seatId, cardInstanceId): boolean
applyPlay(state, seatId, cardInstanceId, cell): EngineResult
applyExchange(state, seatId, cardInstanceId): EngineResult
applyForcedPass(state, seatId): EngineResult
findNewSequences(stateAfterPlacement, teamId, lastCell): Sequence[]
projectForViewer(serverRoom, guestId): ViewerSnapshot
```

Return new state plus typed events; do not partially mutate on failure. One input action either succeeds in full or changes nothing.

### 10.2 Accepted play transaction order

1. Authenticate actor; resolve room membership and human seat control.
2. Check deduplication record before stale-version validation.
3. Check room phase, round ID, expected round version, current seat, and turn ID.
4. Validate selected card instance is in that seat's hand.
5. Validate coordinates and card-specific target against `legalActions`.
6. Apply placement/removal and discard the specific card instance.
7. For placement, find and register newly earned sequence records.
8. Draw replacement (including any required discard recycling).
9. Record board last move and public discard event; reset consecutive-pass count.
10. If winning threshold reached, set result and terminal phase. Otherwise advance current seat and reset exchange allowance.
11. Increment room version and round version; persist snapshot, public events, private state, and idempotency response in one transaction.
12. Commit before acknowledging success/broadcasting personalized snapshots.

No UI animation, client-supplied score, client-supplied turn, or timer may shortcut those checks.

### 10.3 Sequence detection without double-counting

Generate the 192 possible five-cell windows on a 10 × 10 board: 60 horizontal, 60 vertical, 36 diagonals in each direction. Precompute once.

After a placement:

1. Filter windows containing the new logical cell.
2. Keep windows whose nonfree cells all have the acting team's chip.
3. Normalize each window to a sorted logical-cell key; exclude already-registered keys.
4. Reject candidates sharing more than one coordinate with any previously registered sequence for that team. Treat a corner as a coordinate for this intersection test.
5. Enumerate compatible subsets of the remaining candidates: each pair must share at most one coordinate. Because the target is at most two, only size-one and size-two subsets are needed.
6. Pick the subset awarding the most sequences, capped at the number still needed to win. On ties, choose lexicographically smallest sorted window-key list. This is a digital policy, not a player-choice dialog.
7. Append exact five-cell sequence records. Mark their noncorner cells protected. Never later move an old window to make a different scoring opportunity.

Do not simply count every five-cell sliding window in a six-cell run. Crossing lines may produce two records in one move. A nine-cell line can yield two compatible windows when the placement and existing protected records permit it. Test the exact algorithm, not an approximate “run length / 5” calculation.

### 10.4 Draw pile and pass fallback

- Draws pop a specific instance from the persisted shuffled pile.
- Empty pile: shuffle all physical discard instances into a new pile and clear those piles. Historical public move records remain, but those records are not physical cards and must not be added a second time.
- A just-discarded card is eligible for recycling if it is in the discard pile when recycling occurs; do not invent a hidden exclusion.
- Total card instances across hands + draw + discard remains 104 at every stable state.
- Track consecutive forced passes. Exchange alone does not reset this counter; only a board-changing play resets it.
- If every seat consecutively passes without any intervening board change, end as a draw with `No legal moves remain this cycle` (explicit version-1 house fallback; it does not claim a proof about all future possible shuffled draws).
- Also stop a round at 2,000 accepted turn-ending actions as a defensive draw safeguard, with reason `Move limit reached`. This avoids endless automated cycles; it is not a normal win condition.

### 10.5 Essential invariants

Exactly one current seat in a playing round; none actionable after terminal result. Exactly one controller per seat. No corner chip ownership. No opponent protected-chip removal. No card duplication/loss. A failed action leaves state/version unchanged. A duplicate successful command returns its prior outcome without drawing twice. Private projection exposes only the viewer's hand. All score records correspond to actual protected cells. No engine behavior depends on player display names or colors.

## 11. Computer opponents

Implement one original lightweight heuristic against the shared rules engine. Research found a Sequence project with a `heuristic_agent.py`, but importing its entire RL stack is unnecessary, and code reuse requires verifying its actual license first: [research candidate](https://github.com/karthikv792/RL-for-Imperfect-Info-Games). Do not copy unlicensed source.

### 11.1 Information boundary

`BotObservation` contains its own hand, public board, public sequence records, turn order/team assignments, publicly played cards, and draw-pile count. It must not contain human/teammate hands, deck order, shuffle seed, or private connection credentials. Pass a fresh observation object, not a full state with an instruction to ignore fields.

### 11.2 Deterministic basic strategy

1. Ask shared engine for legal actions.
2. If an ordinary dead card exists and exchange is unused, exchange the first such card by stable hand order, refresh observation, then continue. Do not recursively exchange again.
3. For each legal board move, simulate its public board outcome.
4. Rank moves lexicographically by: wins round now; number of new own sequences; reduction of opponents' immediate geometric winning targets; reduction of opponent four-chip sequence windows; own potential-window gain; preservation of Jacks. Exact counting is defined in §28.2.
5. For potential windows with no opponent chip, score own occupancy with weights `[0,1,4,16,64,256]` for counts 0…5, counting corners as friendly. Opponent threats are geometric estimates, not assertions about cards they hold. Compute against both opponents in a three-team game.
6. Penalize spending a placement Jack when a normal card makes the identical placement; prefer the normal card on an otherwise equal score.
7. Stable tie-break by seeded random choice among equal best moves. Test with a fixed test seed; production seed stays server-side.
8. If no board move/exchange exists, use the validated forced-pass action.

Think time: choose `350 + randomInt(301)` milliseconds once per bot turn for presentation, outside engine logic (uniform integer 350–650 inclusive). Persist/reuse scheduled turn identity; injected seeded RNG supplies repeatable test delays. CPU budget target <50 ms per decision on server. If scoring fails/times out, choose a legal action from the already validated list, never an arbitrary cell. Log sanitized failure.

Schedule exactly one bot job per `(roomId, roundId, turnId)`. Recheck turn and controller immediately before committing. Cancel stale jobs on replay, pause, terminal result, or human reclaim. Bots send through the same validation/persistence pipeline as humans.

If all humans disconnect, pause bot scheduling immediately; do not let bots finish an unattended room. When one human returns, re-evaluate the current seat/controller and resume.

## 12. Menus, overlays, results, and replay

### 12.1 Shared overlay behavior

Only one modal/dialog is active at a time. Escape closes the topmost dismissible overlay; outside click closes popovers but not destructive confirmations. Trap focus in modals, mark background inert, and restore focus on close. Popovers are anchored and reposition at viewport edges. Opening Menu or How to play does not pause a multiplayer turn.

If the round finishes while a dialog is open, replace ordinary menus/help with results after closing any name-edit draft safely. Never let an old modal conceal a result indefinitely. If another participant replays while results are open, close results and render the new round snapshot.

### 12.2 Menu items

| Item | Interaction |
| --- | --- |
| New game | Open create-new-room confirmation/flow (§6.3); does not reset group |
| How to play | Open concise rules dialog, with normal card/Jack/corner examples and digital adaptations |
| Sound | Local preference toggle; default off; applies immediately; persist locally |
| Animations | Local preference toggle; respects reduced-motion override; persist locally |
| Leave game | Open explicit confirmation |

Menu button toggles its popover. Selection closes the popover before opening a new dialog. How to play includes a Credits link. No new icon-only header control is needed.

Sound/Animations toggles stay in the menu after activation, update their accessible checked state immediately, and do not open a dialog. Up/down moves between menu items, Home/End first/last, Enter/Space activates, Escape closes. Disabled items remain identifiable with an explanation but cannot submit. The Menu button exposes `aria-expanded` and the popover's control ID.

Sound events, if enabled: soft card/chip tick, local-turn cue, non-winning sequence cue, result cue. No background music, endless loops, or sound before user interaction. Avoid duplicate cues on reconnect by deduplicating event IDs. Sound is an enhancement; gameplay never waits on audio.

Leave confirmation text: `Leave this game? A computer will take your seat for the rest of this round.` During lobby use `Leave this lobby?`. Buttons: **Stay**, **Leave**. On success route to a small `You left the game` state with Create game / Join game; do not immediately auto-create a room. An explicitly departed person loses control of the old seat; reconnect rules do not reclaim it.

### 12.3 Results

- Freeze gameplay; keep final board visible and use the active board-reveal/results footer styling.
- Team/participant-relative title: `You win!` or `Blue wins` / `You lose`; draw: `Draw`.
- Subtitle derives from actual team participants and score; do not hardcode You & Amara or Red's none.
- Show two or three team scores, team colors, exact winning sequence highlights, **Replay**, and **New game**.
- Use the raw local-team color on the replay primary button unless contrast requires its text color to change.
- A small one-shot celebration may last ≤700 ms; no looping confetti. Reduced motion: no particles, just static result/highlight.
- Last move and completed sequences remain visible behind the result presentation. There is no actionable next turn after a win.
- Menu remains accessible from results. Version 1 keeps the approved result footer visible; do not add an unapproved View board/Results toggle. The uncovered portion of the final board stays visible and noninteractive.

### 12.4 Replay: exact semantics

Any connected human participant can click Replay after a win or draw. There is no vote, no per-player checkmark, and no unanimous readiness gate.

Server validates terminal round ID and command ID, then creates exactly one new round in the same room with the same teams, colors, seats, and computers. Keep room code and guest profiles; reshuffle/deal; clear chips, previous sequences, last move, selection, result, and exchange state. Advance dealer one seat. Connected participants automatically receive the new round.

Temporary-disconnect human seats become computer-controlled for the new round until reclaimed at a turn boundary. Explicitly departed seats are already computers and cannot be reclaimed by the departed guest. At least one connected human is required.

Two people clicking simultaneously must return the same successor round ID, not create two rounds. Retain `previousRoundId → successorRoundId` in persistence. A second request naming the old terminal round returns that successor even if a new round is already underway. Never reset the newly started round a second time.

UI on click: **Starting…**, disabled until acknowledgement. Everyone may see `Alex started a new round` for 1.5 seconds. Their participation is not blocked waiting for this notice.

## 13. Responsive behavior, accessibility, and motion

### 13.1 Layout rules

Use a full-height app shell with `100dvh`, top row, flexible board region, bottom hand row. Account for safe-area insets. Board and hand are centered; space above and below the board remains equal. Do not use arbitrary footer margins to make the game shorter.

- Desktop reference: match §2.4. Board scales down uniformly to available center area, never stretches its aspect ratio independently.
- Short desktop/tablet landscape: reduce header/hand height within readable bounds; board maximizes the remaining rectangle. Keep hand at least 56 px tall when possible.
- Phone portrait: header compacts to brand + current player + Menu; remaining roster is a horizontally scrollable strip. Hand is horizontally scrollable if it cannot fit. Board stays landscape, centered with a fit-to-width overview and an explicit Expand board button.
- Board under 600 CSS px wide enters inspection mode: tapping a card target first opens a magnified local board view with ≥44 px cell targets. A second tap on the chosen valid cell commits; Cancel returns to overview. This is the intentional small-screen exception to immediate normal-mode placement.
- Expanded board is a scrollable/pannable region with pinch/browser zoom allowed and a visible Close control. Do not disable user scaling. It must preserve coordinate mapping and selected card.
- Lobby phone: stack team panels; plus overlaps the seam between the first two panels. Three teams stack. Footer buttons stack with full width. No labels/cards may be clipped horizontally.
- Join input retains the two-card composition, scaling to fit 320 px viewports. Dialogs max out at viewport minus 16 px per side and scroll internally.

Phone layouts are implementation extensions, not permission to change the approved desktop composition. Capture visual tests at 1280×1040, 1440×900, 1024×768, 844×390, and 390×844.

### 13.2 Accessibility

- All interactive regions are actual buttons/inputs or accessible composites, not click-only divs.
- Buttons have ≥44×44 px touch hit areas where space permits; compact board uses the magnified interaction above.
- Board keyboard navigation: one roving tab stop; arrows move display-grid cell focus; Home/End row ends; Enter/Space attempts selected action; Escape clears selection/closes magnifier.
- Hand navigation: Tab enters hand, arrows move between cards, Enter/Space selects. Full labels include rank/suit, selected/dead/disabled reason.
- Board cell accessible name: `Row 3, column 8, nine of hearts, empty, valid placement` or owner/protected/last-move status. Use displayed coordinates for spoken navigation, logical coordinates internally.
- Use polite live region for turn changes, accepted moves, sequence, reconnect status. Do not announce all 100 cells on every update.
- Team identity is not color alone: team name, avatar indicator, and accessible chip owner accompany color. Sequence locks/removal icons distinguish green/gold functions.
- Ensure text/button contrast; visible keyboard focus must not be mistaken for game selection. Keyboard focus can use an external dashed neutral ring, distinct from the thin gameplay outline.
- No hover-only essential information; touch/keyboard equivalents are specified above.

### 13.3 Motion contract

| Effect | Duration/behavior |
| --- | --- |
| Hover/press | 90 ms opacity/background change |
| Selected hand lift | 110 ms, translateY(−6px), no bounce |
| Chip placement/removal | 140 ms fade/scale between 0.94 and 1, not a long fly-in |
| Player/team row move | 140 ms |
| Popover/dialog | 120 ms enter / 90 ms exit; fade + at most 4 px translation |
| Sequence emphasis | 240 ms one-shot highlight, persistent border afterward |
| Winner celebration | 600 ms once; never delays Replay |

Animate transform/opacity wherever possible. Respect `prefers-reduced-motion`: remove travel/particles/scaling and use immediate state changes or ≤80 ms fades. No animation creates or advances a turn. Authoritative state is applied immediately even when visuals are animating.

## 14. Connection lifecycle, host migration, and seat control

### 14.1 Connection states

Client state: `connecting → connected → reconnecting → connected`, or `expired/error`. On lost transport, show `Reconnecting…`, keep last confirmed board visible, and disable all server-changing controls. Never allow offline moves to queue for a later turn.

Reconnect with exponential backoff/jitter capped at 10 seconds. After 10 seconds of no connection, show Retry and an explanation that the seat is reserved temporarily. Do not erase the hand or redirect just because one request timed out.

On reconnect request a complete viewer snapshot; compare round ID/version, replace local state, clear invalid selection/pending UI, then enable interaction. Missed animations do not need replay; current correctness takes priority.

### 14.2 Human disconnect during game

- Detect no active controlling socket for that seat; publish disconnected presence.
- Keep their seat/hand/team. Continue other players' turns until the disconnected seat becomes current.
- If still disconnected 30 seconds after disconnection, permit automatic computer takeover. If their turn arrives earlier, wait until that deadline; show `Waiting for Alex · computer takes over in N seconds`.
- This is a disconnection grace period, not a timer on connected humans.
- A returning authorized guest gets their original seat back only at a safe turn boundary. If a takeover bot command has not committed, cancel it and reclaim immediately; if it has committed, accept that move and reclaim for the next turn.
- Serialize reclaim and bot commits through the room actor. Exactly one wins the race.
- Hand never changes just because controller changes. In results/replay, maintain the distinction between reclaimable disconnected seat and permanently departed seat.

### 14.3 Lobby disconnect and host

- Reserve disconnected lobby seats for 60 seconds, showing status and preventing Start.
- At expiry remove the disconnected member. A later reconnect may rejoin if space remains; their old seat is not guaranteed.
- If host explicitly leaves, transfer host immediately to the earliest-joined connected human.
- If host disconnects, wait 30 seconds then transfer to earliest-joined connected human. If none, keep the room without an active host until one reconnects; the first returning authorized human becomes host.
- Host migration does not change turn order, hands, team colors, or game outcome. Computers never become host.

### 14.4 Multiple tabs, all-away pause, restart

- One controlling tab per guest membership. A new tab shows `This game is open in another tab` with **Use this tab**. Taking control revokes the old tab's command lease but allows it to show read-only state. Socket ID is not identity.
- Commands include the current control-lease ID; server rejects revoked leases. Reconnection may restore a valid lease.
- When no humans are connected, freeze bot timers. Do not delete the room immediately. On human return resume from persisted state.
- Server restart loads snapshots, invalidates transport leases, and requires session-authenticated reconnect. It must not redeal, reset score, lose a move already acknowledged, or immediately run all overdue bot timers.
- Expire room after the inactivity policy in §1.2; send `ROOM_EXPIRED` on later access. Stop access immediately, quarantine its code for one hour, and purge its live private snapshots/events after a further 24-hour incident-retention window. Seven-day restricted backups may retain an older copy until their normal expiry; do not promise instantaneous erasure from backups.

## 15. Implementation architecture and repository structure

Recommended concrete stack: TypeScript throughout; React + Vite frontend; Fastify HTTP server; Socket.IO transport; SQLite via `better-sqlite3`; Zod input schemas; pnpm workspace; Vitest engine/server tests; Playwright browser tests. Use Node 24 LTS, pin the actual supported patch and all dependencies in the lockfile when scaffolding. Node's official release listing currently identifies 24 as LTS: [Node release schedule](https://nodejs.org/en/about/previous-releases). Frontend/server setup references: [Vite](https://vite.dev/guide/), [Fastify](https://fastify.dev/docs/latest/).

Do not introduce Kubernetes, Redis, multiple game servers, or a separate database service for version 1. One application process owns all room actors. SQLite resides on a durable local volume, not a network filesystem. Enable WAL and foreign keys; use a busy timeout. See [SQLite WAL documentation](https://www.sqlite.org/wal.html).

```text
childrex-sequence/
  apps/web/src/
    app/                 routes, guest bootstrap, room shell
    components/          Board, Cell, Chip, Hand, Card, PlayerCard
    lobby/               teams, color picker, invite, code entry
    overlays/            Menu, Rules, AvatarPicker, Results, Confirm
    state/               viewer snapshot, local selection, connection
    styles/              tokens.css, layout.css, component styles
  apps/web/public/sequence-assets/
    cards/               52 retained SVG faces + card backs
    avatars/             24 specified Avataaars SVGs (selected style; option set is a default)
    fonts/               licensed local font assets
  apps/server/src/
    auth/                guest cookies, sessions, control leases
    rooms/               actors, membership, command dispatcher
    persistence/         SQLite migrations, repositories, transactions
    transport/           HTTP endpoints, socket projection and ack
    jobs/                bots, grace periods, room expiration
    observability/       redacted logs, health, counters
  packages/engine/src/    cards, board, legal actions, scoring, reducer
  packages/protocol/src/  Zod schemas and public TypeScript contracts
  packages/bot/src/       observation and heuristic (no full-state access)
  tests/e2e/             multi-context gameplay and recovery
  tests/fixtures/        deterministic legal states, Canvas comparisons
  deploy/                Dockerfile, compose.yaml, deploy/rollback scripts
  docs/                  this spec, runbook, design-state map, licenses
  .github/workflows/     verify.yml, release.yml
```

Server serves the compiled SPA under `/sequence/` and a separate static root homepage at `/`. Configure Vite base `/sequence/`; router basename `/sequence`; Socket.IO path `/sequence/socket.io`; API prefix `/sequence/api`. Do not accidentally return SPA HTML for missing `.svg` assets or API paths.

### 15.1 Frontend state ownership

`ViewerSnapshot` is server state. Local-only state: selected card instance, focused cell, open overlay, draft name, sound/motion settings, pending command UI. Do not maintain independently mutable local score/turn/deck state.

Prefer immediate local selection but pessimistic board commits: show a subtle pending target after click, finalize only on confirmed server state. This avoids falsely placing a chip during a stale turn. A late snapshot must never replace a newer round/version.

### 15.2 Data shapes

```ts
type TeamId = string;
type SeatId = string;
type CardInstanceId = string;
type Cell = { row: number; col: number }; // integers 0..9, logical
type RoomPhase = 'lobby' | 'playing' | 'finished' | 'expired';

interface Team { id: TeamId; color: 'blue'|'red'|'green'|null; seatIds: SeatId[] }
interface Seat {
  id: SeatId; teamId: TeamId;
  guestId: string|null; // null for original/permanently substituted computers
  controller: 'human'|'computer'; reclaimable: boolean;
  name: string; avatarId: string; joinedOrder: number;
}
interface SequenceRecord {
  id: string; teamId: TeamId; cells: Cell[]; // exactly five
  createdTurnId: string;
}
interface LastBoardMove {
  eventId: string; seatId: SeatId; teamId: TeamId;
  kind: 'place'|'remove'; cell: Cell; cardFace: string;
  turnId: string; occurredAt: string;
}
interface RoundState {
  id: string; version: number; boardVersion: number;
  turnId: string; turnOrder: SeatId[]; currentSeatIndex: number|null; // null when finished
  dealerSeatIndex: number; exchangeUsed: boolean;
  chips: (TeamId|null)[][]; sequences: SequenceRecord[];
  hands: Record<SeatId, CardInstanceId[]>; // SERVER ONLY
  drawPile: CardInstanceId[]; discards: CardInstanceId[]; // SERVER ONLY
  lastBoardMove: LastBoardMove|null;
  consecutivePasses: number; completedTurns: number;
  result: { winnerTeamId: TeamId|null; reason: string }|null;
}
```

Persist board state/round JSON plus normalized guest, membership, command, and public-event records. Persist immutable `roundId`, `roomVersion`, `roundVersion`, timestamps, and successor-round link. Keep presence/control-lease state separate from gameplay version so a tooltip/profile update does not invalidate a legal card play.

`ViewerSnapshot` includes public teams/seats, phase/versions, current/next seat, chips/sequences, result, last move, counts, recent public actions, host ID, and **only `yourHand`**. On the actor's turn it also includes their current legal targets and exchange/pass eligibility. Public round data never has a `hands` or `drawPile` property. Construct the projection using an allowlist; do not serialize full state then delete fields afterward.

### 15.3 Persistence requirements

Tables: `guests`, `sessions` (hashed session token), `rooms`, `memberships`, `rounds`, `command_receipts`, `public_events`, `schema_migrations`. Unique constraints: active room code; command `(guestId, roomId, commandId)`; successor per previous round. Distinguish bot/system actors with separate authenticated internal IDs.

Store accepted actions/snapshot/receipt together transactionally. Keep plaintext game-private state inside the restricted database volume only; redact it from logs and diagnostics. Do not serve database, backups, runner work directories, or `.env` from HTTP. Backups contain private state and need the same protections.

## 16. API and command contract

### 16.1 HTTP endpoints

| Method/path under `/sequence/api` | Function |
| --- | --- |
| `POST /guest` | Create/reuse session; return own public profile + CSRF token |
| `GET /me` | Own profile, resumable membership, not other users' sessions |
| `POST /rooms` | Idempotently create room/host membership |
| `PATCH /profile` | Session-authenticated own profile edit, including before membership |
| `POST /rooms/lookup` | Body `{code, expectedRoomId?}`; return joinability/player count, no names/hands |
| `POST /rooms/join` | Atomically validate code, create membership, optional old-room switch |
| `GET /rooms/:id` | Authenticated personalized snapshot |
| `POST /commands` | HTTP fallback to same authenticated dispatcher used by sockets |
| `GET /rooms/:id/commands/:commandId` | Own retained command receipt; no other guest's receipts |
| `POST /rooms/:id/control` | Obtain/take over transport-independent control lease |
| `GET /health/live` | Process alive; no secrets |
| `GET /health/ready` | DB accessible/schema valid, app can accept commands |
| `GET /version` | Build SHA and protocol version |

HTTP and socket commands share one dispatcher and one validation path. Cookies identify actor. State-changing HTTP requests require CSRF token and same-origin validation; socket handshake must validate Origin/session and control lease. Configure proxy trust narrowly; never trust arbitrary forwarded IP headers from the internet.

### 16.2 Command envelope

```ts
interface Command<T> {
  commandId: string;       // UUID, stable across retries of THIS intent
  protocolVersion: 1;
  roomId: string;
  roundId?: string;
  expectedRoomVersion?: number;  // lobby/config operations
  expectedRoundVersion?: number; // board actions
  turnId?: string;
  controlLeaseId: string;
  type: string;
  payload: T;
}
type Ack =
 | { ok: true; commandId: string; roomVersion: number; roundId?: string;
     roundVersion?: number; eventIds: string[] }
 | { ok: false; commandId: string; code: ErrorCode; message: string;
     resyncRequired: boolean };
```

The actor's team/guest/seat is resolved server-side; a payload cannot impersonate another player. Host operations can name a target seat, but server checks host permissions.

| Command | Payload |
| --- | --- |
| `profile.update` | `{name? , avatarId?}` validated allowlist |
| `lobby.moveSeat` | `{seatId, destinationTeamId}` |
| `lobby.setColor` | `{teamId, color}` |
| `lobby.addTeam` | `{}` |
| `lobby.removeTeam` | `{teamId, confirmedRedistribution}` |
| `lobby.addComputer` | `{teamId}` |
| `lobby.removeComputer` | `{seatId}` |
| `round.start` | `{}` |
| `round.play` | `{cardInstanceId, cell}` |
| `round.exchangeDeadCard` | `{cardInstanceId}` |
| `round.pass` | `{}` |
| `round.replay` | `{finishedRoundId}` |
| `room.leave` | `{}` |
| `room.switch` | Exactly one of `{destinationCode, expectedDestinationRoomId?, preferredTeamId?}` or `{createNew:true}` |
| `seat.takeControl` | `{}` via authenticated connection bootstrap |

Transport events: client `command`, server `snapshot`, server `notice`, server `sessionRevoked`. Snapshot includes monotonically increasing room version and round ID/version. A notice carries an event ID so duplicate delivery does not duplicate toasts/sounds. Do not send public room-wide snapshots containing a private hand; emit personalized payloads per authenticated viewer.

### 16.3 Delivery, retries, races

Socket.IO ordering is not an exactly-once application guarantee; delivery/recovery must be handled explicitly. [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/).

- Client creates command UUID once; retry after 3-second acknowledgement timeout, at most twice while still connected, using that same UUID.
- After timeout, display `Checking move…` and fetch current snapshot/receipt; do not generate a fresh play command automatically.
- Server looks up receipt before version checks. If already accepted, return it. Duplicate malicious payload under the same UUID with a different hash is rejected.
- Per-room actor queue serializes commands. Database uniqueness is the final duplicate guard. Cross-room switching uses ordered locks and one DB transaction.
- If expected gameplay version/turn differs, reject `STALE_STATE` and resync. Clear selection if its card is gone; otherwise retain only if still the viewer's turn and legal.
- Ignore older snapshots. On a room-version gap or reconnect, fetch full snapshot; event replay is not required for correctness.
- Disable transport's blind replay of queued gameplay commands after reconnect; reconcile receipts/round first.

### 16.4 Errors and user copy

| Code | User behavior |
| --- | --- |
| `ROOM_NOT_FOUND` / `ROOM_EXPIRED` | Explain; Create game / Join another; no spinner loop |
| `ROOM_FULL` | Stay in previous room/join screen; `This game is full.` |
| `ROUND_STARTED` | `This game has already started.`; existing members may resume |
| `NOT_HOST` | Refresh permissions; `Only the host can do that.` |
| `TEAMS_UNBALANCED` | Keep lobby; show required balancing action |
| `COLOR_IN_USE` | Refresh swatches; `That color is already in use.` |
| `NOT_YOUR_TURN` / `STALE_STATE` | Resync; no card/chip loss |
| `CARD_NOT_IN_HAND` / `ILLEGAL_TARGET` | Resync and clear stale selection |
| `PROTECTED_CHIP` | `That chip is part of a completed sequence.` |
| `EXCHANGE_USED` | `You can replace one dead card per turn.` |
| `LEGAL_MOVE_AVAILABLE` | Do not pass; show playable choices |
| `LEASE_REVOKED` | Read-only banner with Use this tab |
| `RATE_LIMITED` | Show wait/retry interval; do not hammer endpoint |
| `SERVER_UNAVAILABLE` | Preserve last confirmed state; Retry |
| `PROTOCOL_MISMATCH` | `An update is available. Reload to continue.` |

Validation failures are structured errors, not uncaught 500s. Log detailed sanitized reason server-side; do not expose stack traces.

## 17. Security, privacy, assets, and performance

### 17.1 Security baseline

- Validate all payloads, enums, sizes, integer coordinates, room membership, permissions, turn/round, and card ownership on server.
- Guest creation limit: 20/hour/IP. Room creation: 10/hour/guest and 30/hour/IP. Code lookup/join: 30 attempts/minute/IP and 10/minute/session, exponential cooldown on repeated failures. Commands: 20/second/session, burst 30; profile updates 10/minute. Tune only after monitoring.
- Code-allocation capacity: at most 100 live/quarantined two-digit codes combined. On exhaustion, reject new room creation gracefully with `All game codes are in use. Please try again shortly.` Existing games continue. Load-test the actual service capacity separately; reduce the operational admission limit if needed, never expand the visible code format implicitly.
- Payload limit 16 KiB; no arbitrary asset URL/HTML/file upload fields.
- Same-origin requests only; tight CSP; no runtime third-party avatar dependency; render all names as escaped text.
- Private hand must be absent from other users' network payloads, errors, logs, analytics, HTML source, and end-game UI.
- Log command type, room ID, event ID, latency/error code; do not log session cookie, CSRF token, full invite URL, deck/hand, or request body by default.
- No analytics service in version 1. Retain operational room data for the room lifetime plus 24 hours for incident diagnosis, then delete; keep aggregate counters without player content.

### 17.2 Assets and visual fidelity

Existing card assets are in `card-assets/svg cards/`; their local README/LICENSE identify The Public Domain Deck and CC0 source material. Copy licensed source SVGs into the app, normalize filenames (e.g. `9H.svg`), and preserve provenance/license in `THIRD_PARTY_NOTICES.md`. Exclude jokers from gameplay even though the library contains them.

SVG as an image is still vector artwork in the browser. Use retained SVG resources, not PNG conversions or canvas-rasterized screenshots. Converting an SVG into editable geometry is useful for later logo editing, but not necessary to display sharp cards. Test 400% zoom and high-DPI screens. Remove scripts/external resources from imported SVGs during asset preparation; keep rendering fidelity.

Do not use the commercial product photograph as an asset, trace packaging artwork wholesale, or imply official affiliation. Track the source/license of card, font, avatar, and medallion artwork separately. Retain the approved text wordmark treatment; any public-branding rights review is a launch consideration, not something a permissive card license automatically resolves.

### 17.3 Performance targets

- Local selection feedback within one animation frame, target ≤50 ms after input.
- Server action handler excluding network: p95 ≤50 ms under agreed load.
- Same-region accepted-move update target p95 ≤250 ms; measure, do not promise worldwide latency.
- Main game JS initial compressed budget ≤300 KiB excluding lazy help/assets; lazy-load avatar picker options.
- Preload current hand/card SVGs; cache fingerprinted assets immutably. Do not request 100 duplicate copies of the same card asset.
- Render only changed cells/player details; do not remount all 100 cells on every presence heartbeat.
- Bot compute ≤50 ms target; no training/GPU dependence.

## 18. Deployment and CI/CD runbook

### 18.1 Confirmed environment

Read-only inspection succeeded using `ssh Personal-Hetzner-Server` on 11 September 2026. Host reported `ubuntu-8gb-nbg1-1`. Existing services include Schoolbase, Docker-hosted applications, `nginx-proxy`, `acme-companion`, and multiple repository-specific Actions runner services. Shared Docker network is `nginx-proxy`.

At inspection: root disk ~15 GiB available/80% used; memory ~3.7 GiB available, swap already in use. These are observations, not deployment-time guarantees. Recheck before installing/building. No existing server application was changed by the inspection.

SSH currently resolves to root; do not make the application or new runner root merely because the inspection login is root.

### 18.2 Isolation and names

- Repository proposed: `EmmanuelPenkra/childrex-sequence`, private.
- Runtime Compose project: `childrex-sequence`.
- Service/container: `childrex-sequence-app`.
- App config/releases: `/opt/childrex-sequence/`.
- Durable database: `/srv/childrex-sequence/data/`.
- Backups: `/srv/childrex-sequence/backups/` with restrictive access.
- Runner: separate service/user and directory, e.g. `/opt/actions-runner-childrex-sequence`; repository-specific label `childrex-sequence-production`.
- Do not re-register, stop, change labels on, or borrow the Schoolbase runner.
- App runs as non-root container user, no Docker socket, no host network, no public database port. Attach app to existing proxy network. Bind internal app port 3000, not a second host 80/443 listener.
- Initial runtime limit 512 MiB and 0.75 CPU, verify under load; separate runner work/build capacity. No global Docker prune or broad service restart.

Use shared proxy's existing hostname/certificate conventions after inspecting them. `VIRTUAL_HOST=childrex.com`, `VIRTUAL_PORT=3000`, and appropriate ACME companion configuration are the intended integration, not permission to overwrite the shared proxy config. The [ACME companion project](https://github.com/nginx-proxy/acme-companion) documents its integration.

### 18.3 Workflows

`verify.yml`: pull requests and pushes; GitHub-hosted runner. Frozen lockfile install; lint; typecheck; engine/server tests; production build; Playwright; asset/notice checks. Untrusted PR code never runs on the production self-hosted runner.

`release.yml`: successful verified protected-main push, plus explicit workflow_dispatch rollback/deploy. Build immutable Docker image on a GitHub-hosted runner; tag with commit SHA and push to private GHCR. Deploy job uses the dedicated self-hosted runner with minimum permissions, serial concurrency group `childrex-sequence-production`, `cancel-in-progress: false` for deploy steps.

Pin Actions by full commit SHA. Do not use `pull_request_target` to check out/run untrusted code. Set contents read-only by default; grant package write only to image-publish job. Keep runtime secrets outside repo and out of frontend build variables. Self-hosted runners require particular care with trusted code and secrets: [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

Runner must not have arbitrary Docker/root access as a convenience. Prefer a root-owned narrowly scoped deployment helper callable by the runner, validating the immutable image digest and operating only this Compose project. Protect workflow/deployment-script changes with review/branch controls. If Docker-group access is chosen instead, document that it is effectively privileged and obtain owner acceptance of that tradeoff.

### 18.4 Safe release sequence

1. Check branch/SHA/artifact provenance, disk/RAM, DB schema compatibility, and shared proxy availability.
2. Pull new image by digest before stopping anything. No source compilation on the crowded production server.
3. Start a temporary isolated smoke container with a temporary DB, not the live database. Probe HTTP routes, assets, and socket handshake. Remove only that smoke container after check.
4. Announce short maintenance/reconnect window to connected clients. Stop accepting new commands briefly; finish in-flight transaction; persist all rooms.
5. Create a consistent SQLite backup using the backup API, not a naive copy of the `.db` without WAL awareness.
6. Gracefully stop only the old Sequence container. Never run two application writers/bot schedulers against the same DB at once.
7. Apply tested backward-compatible migrations; start new image with the existing volume. Keep old image digest recorded.
8. Check readiness within 30 seconds, version SHA, room restoration, SVG fetches, socket upgrade, and root/Sequence routes.
9. If unhealthy, stop new container and restore old image. Rollback migrations must be compatible; otherwise use the documented DB restore procedure and explicitly account for any post-backup actions. Never silently discard acknowledged moves.
10. Clients reconnect and resume. Recheck unrelated proxy routes such as Schoolbase without modifying them.

Version 1 tolerates a short reconnect window; do not claim zero-downtime deployment with a single writer. Store runtime secrets/config only on server with restricted permissions. Retain last three release images and seven daily backups; cleanup only project-specific known artifacts. Add a periodic restore test to a temporary DB/container.

### 18.5 Domain launch

In Hostinger DNS, inspect existing `childrex.com` records first. Point only necessary web A record(s) at the Hetzner IP confirmed from actual configuration; do not guess. Remove/change a conflicting AAAA only if it incorrectly routes this website and the owner approves the exact change. Preserve MX/TXT/mail and unrelated records.

Verify DNS propagation, port 80 ACME challenge access, certificate issuance/renewal, HTTPS redirect, WebSocket forwarding, `/` placeholder, and direct refresh on `/sequence/room/:id`. If login/2FA is required, ask the owner at that step. Do not buy hosting; the server already exists.

### 18.6 Monitoring

Track readiness, process restarts, command p95 latency, socket counts, active rooms, bot failures, DB write failures, rate limits, disk usage. Rotate container logs with bounded size. Alert/check thresholds: disk <10 GiB, sustained memory pressure, readiness failure, repeated deploy rollback. Do not expose administrative metrics or data snapshots publicly.

## 19. Implementation order and deliverables

Work in these stages; do not jump directly from static UI to production.

1. **Design alignment:** fix active Canvas discrepancies, export representative PNG references and source assets, record active/archive map. Deliver no stale voting/footer/neutral-border variants.
2. **Repository skeleton:** workspace, pinned dependencies, formatting/lint/test commands, root placeholder, route prefix, Docker skeleton, license notices. `pnpm install --frozen-lockfile` and `pnpm verify` succeed cleanly.
3. **Rules engine:** deck/board constants, legal actions, reducer, sequences, exchange/pass/replay, invariants. No network yet; all §20 engine tests pass.
4. **Static UI:** shared components and deterministic legal fixtures for every active state. Compare screenshots including outline corners before adding networking.
5. **Sessions/lobby:** guest identity, room persistence, joining, permissions, colors, computers, balanced Start, avatars/name editing.
6. **Multiplayer turns:** personalized snapshots, command receipts, hand privacy, real board actions, scores/results/replay. Prove with independent browser contexts, not two tabs sharing one guest cookie.
7. **Bots/recovery:** basic strategy, disconnect grace, reclaim/host migration, restart recovery, forced pass/draw behavior.
8. **Responsive/accessibility:** mobile magnification, keyboard play, focus/tooltip behavior, reduced motion, overflow and long-roster fixes.
9. **Production pipeline:** private repo/runners, image build, isolated deployment, backups, rollback verification, DNS/TLS.
10. **Acceptance handoff:** run test matrix, inspect live public game with two devices, provide repo URL, live URL, current commit, deployment/runbook, and known limitations.

Every stage includes tests and a reviewable commit. “Looks right on one machine” is not completion. The developer must not introduce placeholder buttons that do nothing.

## 20. Acceptance tests — required checklist

### 20.1 Engine unit/property tests

- E01: every allowed player/team combination deals exact hand size; invalid counts/unequal teams fail.
- E02: board face counts and coordinate transformation pass all 100 cells.
- E03: both duplicate normal-card targets are legal when empty; occupied one disappears; occupied both makes card exchangeable.
- E04: duplicate hand instances consume only selected instance.
- E05: each Jack face maps correctly; placement never targets corners/occupied cells; removal never targets own/protected chips.
- E06: exchange allowed once, before normal action; exchange does not advance turn; dead replacement does not grant second exchange.
- E07: row/column/both diagonal and free-corner completions score correctly; other teams may use same corner.
- E08: six-cell run not counted as two; crossing compatible five-windows can count twice; nine-line and old-window overlap cases obey deterministic rule.
- E09: protected sequence coordinates do not change after a later move; chip cannot be removed.
- E10: target reached ends immediately; non-winning sequence advances normal turn.
- E11: physical card count remains 104 across >1,000 randomized valid moves/exchanges/recycles.
- E12: no legal move → forced-pass eligibility; passing while exchange/play exists rejected; full board with legal removal does not instantly draw.
- E13: full consecutive-pass cycle / 2,000-turn safeguard produce specified draw reason.
- E14: round replay produces fresh deck/empty board and advanced dealer, preserves teams.
- E15: malformed coordinates/card IDs/phase/turn fail without mutating state/version.

### 20.2 API/concurrency/security tests

- N01: nonmember cannot fetch hand/snapshot or issue room commands.
- N02: non-host cannot configure/start/move another human, including crafted requests.
- N03: guest cannot edit another profile or act from another seat.
- N04: ten repeats of same command produce one mutation and one draw; changed payload under same ID rejected.
- N05: two simultaneous replay requests produce one successor round.
- N06: stale move arriving after turn/replay rejected; prior receipt still retrievable.
- N07: full/started-room join race does not overfill or evict current source membership.
- N08: every viewer payload/log/error excludes every other hand and deck order, including teammates and results.
- N09: restart after commit-before-ack returns old receipt and restored board, not duplicate action.
- N10: bot/reclaim race commits exactly one action/controller.
- N11: session/CSRF/Origin/lease violations rejected; lookup/creation rate limits work.
- N12: invalid/long Unicode names, script-looking names, invalid avatars handled safely.
- N13: two tabs have one control lease; cookies shared in one browser do not create duplicate participants.

### 20.3 Browser interaction scenarios

- U01: first visit creates one neutral lobby, no fake players; reload resumes it.
- U02: choose colors, add computer, balance, Start; actual game starts for everyone.
- U03: circle switches to shown unused color; third-team plus overlaps; adding/removing preserves players as specified.
- U04: badge and Invite a friend copy correct links; clipboard denial has fallback.
- U05: join accepts leading-zero code and pasted invite; invalid/full/started code shows correct state without losing old room.
- U06: own avatar picker saves/syncs; other avatar cannot be edited; name double-tap edits without switching team.
- U07: full name tooltip triggers on whole player card and keyboard/touch equivalents; long names don't expand header.
- U08: select normal card, both valid targets visible, deselect/switch, commit one; hand updates and next turn starts.
- U09: selected hand raw blue/red/green, board light team shade, same thin geometry at all corners; six-pixel lift only on selected hand card.
- U10: opponent turn hand opacity 0.78, no play; gold last-placement/removal cue remains across selection/menu/reload.
- U11: exchange dead card then play; Jack helpers only when selected; no persistent Wild strip.
- U12: non-winning sequence shows green cards and next player's turn; winning one shows correct relative result/scores.
- U13: one Replay click starts for everyone, no voting UI; New game moves only requester to new room.
- U14: Menu outside/Escape closes; Sound/Motion local persistence; confirmation Cancel changes nothing.
- U15: 30-second disconnect takeover/reclaim; 60-second lobby expiry; host migration; all-human-away pauses bots.
- U16: narrow screen can select/commit every board cell with magnification; hand and header stay reachable.
- U17: complete a turn using keyboard only; reduced-motion/sound-off emit no prohibited effects.

### 20.4 Deployment acceptance

- D01: clean clone installs, verifies, builds without undocumented secrets.
- D02: PR verify never schedules on production self-hosted runner.
- D03: protected main release deploys expected SHA/digest, and failures do not touch unrelated containers.
- D04: HTTPS homepage, Sequence nested route reload, SVG assets, and sockets work on public domain.
- D05: live room survives app restart/deployment without losing an acknowledged move.
- D06: backup restores to separate test instance; failed release can roll back.
- D07: CPU/memory/disk/log limits verified under multiple games including computers.
- D08: no public DB/metrics/secrets, missing assets return 404 rather than HTML.

## 21. Definition of done and open gates

The work is complete only when the active designs are reconciled, all listed controls function, rules tests pass, at least two independent real clients can play to win and replay, bots work without hidden information, reconnect/restart scenarios pass, and the live domain is served through the verified CI/CD release.

No additional product choice is required to begin under the defaults above. Remaining operational gates are: repository-name availability; runner registration permissions; exact deployment configuration/secrets; safe DNS change verification; possible Hostinger 2FA; and asset/branding notices before public launch. Do not describe these as already completed.

## 22. Design alignment log

Canvas corrections made during this task:

- Matched `m3-red-copy-46` to the neutral blue panel: `#FFFFFF33`, 1 px, inner stroke.
- Aligned three-team footer join action/height/arrow with the approved two-team version and removed its redundant join link.
- Replaced active initial-letter avatar placeholders with the selected Avataaars style, preserving profile sizes/team indicators.
- Corrected four-player game hands to six cards; three-team winner now has six participants and a five-card hand.
- Removed duplicate join-title text while retaining the original two-card code-entry composition.
- Added Add computer actions to the three-team panels.
- Removed an unintended already-completed line from resting/selected/opponent fixtures.
- Corrected winner emphasis to five cells per highlighted sequence and removed stale next-turn wording from finished screens.
- Added `m3-lobby-copy-2`, a balanced ready-to-start reference alongside the unbalanced and neutral lobby examples.
- Restored two-digit `47` and the `CODE` label after the owner rejected the unrequested six-digit/COPY INVITE changes. Copying remains the badge's action, not its visible label.

The temporary six-digit design must not be used as a reference. Additional behavior in this document is governed by the proposed-default register, not authority to redesign more Canvas screens without review. Saved-state changes are recorded above; full live Canvas-renderer correctness is not asserted merely because an export succeeded.

## 23. Decision register — what is approved versus proposed

This register prevents implementation detail from being mistaken for a new design direction. A complete plan can specify a default without pretending the owner explicitly selected it. No unresolved multiple-choice alternatives are left for the developer below.

| ID | Status | Decision / exact default |
| --- | --- | --- |
| O01 | Owner | Preserve active horizontal board, full-width bars, restrained appearance, thin matching outlines, selected-hand lift |
| O02 | Owner | Avataaars; avatar picker; inline name editing via double tap; player-card hover tooltip |
| O03 | Owner | Keep two-digit code/two-card entry; badge action copies invite; do not label it COPY INVITE |
| O04 | Owner | Add computer opponents; replay needs no unanimous confirmation |
| O05 | Owner | Personal GitHub, existing Hetzner server, CI/CD, Childrex domain and Sequence subpath |
| R01 | Reference | Canvas values in §§2.4 and 27; archived frames excluded; CODE/47 restored |
| P01 | Proposed default | Guest identity, one active room membership per guest, no account system |
| P02 | Proposed default | Host permissions and equal-team Start validation in §5; no ready voting or mid-round newcomers |
| P03 | Proposed default | Any connected human can replay a finished round; New game creates a separate room for requester |
| P04 | Proposed default | Connected humans have no timer; disconnect grace 30 s, takeover/reclaim, lobby removal 60 s |
| P05 | Proposed default | Phone magnification interaction in §26.7; desktop design unchanged |
| P06 | Proposed default | Sound off initially; exact quiet synthesized cues in §24; no background sounds or notifications |
| P07 | Proposed default | Motion timings/easing/cancellation in §25; reduced-motion behavior mandatory implementation support |
| P08 | Proposed default | 24 reproducible avatar options; no uploads/feature editor; exact generation manifest in §27.3 |
| P09 | Proposed default | Automatic draws/sequence claims, deterministic long-run resolution, validated forced pass and bounded draw fallback |
| P10 | Proposed default | Initial neutral lobby allocation, expiry/capacity/rate-limit policy; two-digit limitation explicitly accepted as a design constraint, not hidden |
| P11 | Proposed default | Fixed basic bot heuristic, no imported unlicensed bot code or training service |
| P12 | Proposed default | Technical stack, repository name, persistence, deployment isolation, and maintenance-window approach |
| P13 | Proposed default | Loading/error/accessibility additions necessary for working controls; no unrelated new visual feature |

Implementation handoff must include this register. If the owner changes a row, change its dependent test cases and corresponding document sections together. The developer must not enlarge the invite code, add permanent headings, restore archived views, add profile/account flows, or introduce replay voting under the label of “best practice.”

## 24. Complete sound contract

### 24.1 Assets, generation, and audio graph

Version 1 uses **original synthesized cues**, not unspecified downloaded files. There is therefore no outstanding sound-library or sample-selection decision. Implement `audio/cues.ts` with the exact recipes below using native Web Audio. No microphone access, remote audio URL, music library, Howler, Tone.js, or sound-font package is needed.

One `AudioContext` per document, one master GainNode at **0.18**, mono signal sent equally to stereo outputs. Each note is a sine oscillator with its own gain envelope. Note peak is **0.35** before master gain. No reverb, compression, bass boost, pan, random pitch, or repeated loop. Device/OS volume remains the user's volume control; no extra on-screen volume slider in this version.

Note recipe `tone(startMs, durationMs, startHz, endHz = startHz)`:

1. Create oscillator with `type='sine'`; set frequency at start; linearly ramp to end frequency at note end when different.
2. Gain is 0 at note start; linearly ramp to 0.35 over 5 ms; linearly ramp to 0 at note end. All specified notes exceed 5 ms.
3. Connect oscillator → note gain → master gain → destination. Start at context time plus offset; stop 5 ms after envelope ends; disconnect on ended.
4. Use one common cue start time for all notes in that cue, not chained `setTimeout` calls. Use AudioParam scheduling. Peak sum must never clip.

For deterministic automated waveform checks, render the same recipe with `OfflineAudioContext`, mono, 48,000 Hz. The production live context can use the device's sample rate; do not recreate it to force 48 kHz. Generated test buffers are test artifacts, not new third-party assets.

Browsers may require a user gesture to start/resume audio, and audio generation through oscillators is supported by the Web Audio API. Follow the API scheduling/unlock behavior described in [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices); the specific cue recipes here are our design defaults.

### 24.2 Cue table

Offsets and lengths are milliseconds. Frequency numbers are Hz. Cue end equals the last note's offset plus duration; no trailing music.

| Cue ID | Exact notes: `(offset, duration, startHz, endHz)` | Trigger / audience |
| --- | --- | --- |
| `place` | `(0,55,720,420)` | Confirmed ordinary/Jack placement; all connected, visible controlling clients |
| `remove` | `(0,70,460,260)` | Confirmed Jack removal; same audience |
| `exchange` | `(0,45,620,480)` | Confirmed dead-card exchange; acting human only |
| `your-turn` | `(0,65,659.25,659.25)`, `(85,85,783.99,783.99)` | A new turn belongs to this human; local only |
| `sequence` | `(0,70,523.25,523.25)`, `(85,70,659.25,659.25)`, `(170,95,783.99,783.99)` | Non-winning sequence; all eligible clients, identical sound regardless of team |
| `win` | `(0,80,523.25,523.25)`, `(100,80,659.25,659.25)`, `(200,150,783.99,783.99)` | Terminal event; members of winning team only |
| `loss` | `(0,85,440,440)`, `(105,120,349.23,349.23)` | Terminal event; other teams only; soft, not an alarm |
| `draw` | `(0,80,523.25,523.25)`, `(100,100,523.25,523.25)` | Draw event; all eligible clients |
| `enabled-preview` | Same recipe as `place` | Once after a successful user action enabling Sound |

Silence for hovering, selecting/deselecting hand cards, invalid targets, opening menus, copying invites, joining/leaving, avatar/name edits, team movement, loading, network errors, reconnection, background tab updates, and replay button click. A replay only produces `your-turn` if the new round starts on this client. Do not add a sound to every button.

### 24.3 Timing, priority, and duplicate suppression

Sound follows **accepted authoritative events**, not speculative UI actions or a success-looking animation. A command acknowledgement without its corresponding accepted state does not trigger a sound. A personalized snapshot/event packet identifies its accepted event IDs; those IDs are the sound deduplication keys.

- Ordinary play that does not produce a sequence: placement/removal cue starts on snapshot application, independent of the 140 ms visual animation.
- If the same accepted command produces a sequence, play `sequence` instead of `place`.
- If it ends the round, play only local `win`/`loss`/`draw`; suppress placement, sequence, and turn cues from that command.
- If a normal move gives the local human the next turn, play the move cue, then `your-turn` 40 ms after its end.
- If a non-winning sequence gives the local human the next turn, play `sequence`, then `your-turn` 40 ms after its end.
- Priority for a newly arriving cue: terminal result > sequence > your-turn > place/remove > exchange > preview. Only one cue plays at a time. A higher-priority new event fades the lower cue to zero over 10 ms and replaces it; a lower/equal-priority new event is dropped. The explicitly scheduled same-command turn cue is the sole exception to dropping a lower-priority cue.
- Before a scheduled turn cue begins, recheck round ID, turn ID, current controller, visibility, preference, and connection. If any no longer match, cancel it.
- Never play a cue for a snapshot received through initial load, reconnect, HTTP resync, or protocol reload. Those are current-state restoration, not newly heard events.
- Ignore repeated event IDs. Retain a bounded 256-ID client LRU plus latest applied room/round version. Do not use user name or message text as a dedup key.
- Drop a cue if it would start >500 ms after its original live packet was applied. Never drain a queue of old sounds.

### 24.4 Preference, browser unlock, and background tabs

Persist `soundEnabled` in local storage under `childrex.sequence.preferences.v1`. Default false. Storage failure does not block gameplay; keep preference in memory for the tab.

When Sound is enabled by clicking/tapping/keyboard activation of the toggle, call `AudioContext.resume()` within that user gesture. If it becomes running, save true and play preview. If unsupported/rejected, keep sound off and show `Sound is unavailable in this browser.` once; do not repeatedly prompt.

For a returning browser with saved Sound on, resume in the first genuine user gesture; before that remain silent without buffering cues. A restored on-state does not authorize autoplay. If the browser later suspends audio, defer resume to the next genuine gesture and discard missed cues.

Turning Sound off fades master gain to 0 over 20 ms, cancels pending cues, stops/disconnects active oscillators, and stores false. Turning on again ramps to 0.18 over 20 ms before its preview. Do not multiply master gain repeatedly across toggles.

On `document.visibilityState === 'hidden'`, cancel pending cues, fade active sound over 20 ms, and suspend context if possible. Returning visible renders latest state but is silent; future live cues may play once context is running. Do not interpret hidden as explicit Leave or immediately detach the game socket. Page visibility can be observed using [the visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event).

Only the controlling tab plays sounds. No browser notification permission requests, vibration/haptics, tab-title flashing, or hidden-tab turn reminder in version 1. Losing connection stops queued cues; an already-started cue may fade out over 20 ms.

## 25. Complete animation and transition contract

### 25.1 Shared implementation constants

```ts
const motion = {
  feedbackMs: 90, selectMs: 110, chipMs: 140, rosterMs: 140,
  enterMs: 120, exitMs: 90, sequenceMs: 240, resultMs: 160,
  particlesMs: 600, reducedFadeMs: 60,
  easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
};
```

Use CSS transitions for simple hover/lift; Web Animations API for cancellable layout/result effects. Keep the final correct state in normal styles, not solely in an animation with `fill:forwards`. Cancellable animation handles are supported by [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate). No animation framework is required.

Rendering applies the latest accepted state before animations. Animation-end handlers can clean up DOM/decorations but must not advance a turn, enable a server action, acknowledge a command, or alter scores. A visual transition must never act as a gameplay lock.

### 25.2 Exact transition table

| Interaction | From → to / timing | Sound | Input behavior |
| --- | --- | --- | --- |
| Hover standard button | Normal → hover background over 90 ms, standard easing; no size change | None | Enabled immediately |
| Button pressed | Hover → pressed background over 90 ms; no spring/scale | None | One intent per activation |
| Hand select | `translateY(0)` → `−6px`, 110 ms easeOut; border color immediate | None | May switch selection before completion |
| Hand deselect | Current offset → 0, 110 ms easeOut; neutral border immediate | None | May reselect |
| Valid board targets | Thin outline on/off immediately; no pulse or scaling | None | Hit areas remain unchanged |
| Pending board play | Keep selected outline; small center dot opacity 0.5, no fake chip or spinning ring | None | Further plays blocked until reconciled |
| Accepted placement | Chip opacity 0 → 1 and scale .94 → 1, 140 ms easeOut | §24 | Next actor can act immediately |
| Accepted removal | Outgoing chip ghost opacity 1 → 0, scale 1 → .94 over 140 ms easeIn | §24 | State already empty; ghost is pointer-events:none |
| Draw/exchange artwork | New card opacity 0 → 1, 120 ms easeOut in its final slot; remaining hand reflows 140 ms | Actor exchange or none | No seven-card transient duplicate; old instance unmounted logically |
| Turn indicator | Text updates immediately; old gold/background → new over 90 ms | Local turn per §24 | Does not wait for highlight fade |
| Team row moves | FLIP from old bounding box to final box, 140 ms easeOut | None | No second move while that row's command pending; after ack animation does not block |
| Team color change | Surface/text token colors transition 120 ms; labels/counts immediate | None | Stable team/seat IDs |
| Add/remove team | New panel opacity 0 → 1; retained panels FLIP 140 ms; no expanding reserved plus slot | None | Configuration serialized |
| Menu/avatar/details popover | Opacity 0 → 1, translateY(−4px) → 0 over 120 ms easeOut; exit 90 ms easeIn | None | Mounted focus/accessibility state immediate |
| Modal/sheet | Backdrop fade 120 ms; panel opacity 0 → 1 and translateY(4px) → 0; exit 90 ms | None | Focus trap active as soon as open |
| Tooltip | Wait 350 ms then fade 90 ms; hide after 100 ms grace + 90 ms fade | None | Never intercept underlying board click |
| Non-winning sequence | Permanent green outlines immediate; one extra tint opacity 0 → .10 at 80 ms → 0 at 240 ms | §24 | Next player remains interactive |
| Result | Result footer opacity 0 → 1 and translateY(8px) → 0 over 160 ms; winner bands fade 120 ms | §24 | Replay/New game clickable immediately on mount |
| Replay accepted | Cancel old decoration; swap to new round; hand/board opacity .85 → 1 over 120 ms; no sequential card-dealing show | Turn cue only | Current player enabled with accepted round |
| Lobby → playing | Shared shell replaces lobby; game content opacity .85 → 1 for 120 ms | Turn cue only | No artificial countdown |
| Join/room navigation | New destination mounts, 120 ms opacity only; retain prior route until request accepted | None | No sideways page carousel |
| Toast | 120 ms enter fade, fixed hold, 90 ms exit | None | Never blocks board; close control for persistent errors |

### 25.3 Result decoration

Default result flourish: at most 12 rectangular confetti pieces, 4 × 8 reference px, inside board region only. Precompute deterministic offsets from terminal event ID. Colors: winning-team color, gold, white. Move at most 40 px downward while rotating at most 45° and fading to zero over 600 ms, easeOut. Do not run gravity simulations, fullscreen explosions, endless emitters, or repeated celebrations on remount.

Loss and draw: no confetti. Winning team gets the flourish only once on the live terminal event. Result band and footer still show on refresh without replaying the flourish. These effects are proposed defaults; do not add permanent decoration to Canvas.

### 25.4 Interruption / simultaneous-event rules

- Newer accepted snapshot always wins. Cancel obsolete animations and render its final authoritative state. Do not finish a pretty animation using stale game data.
- Repeated selection during a lift: retarget from computed current position; never accumulate `translateY` or queue six lifts.
- Fast place then remove on same cell: remove/cancel placement animation; reconcile final chip state; any outgoing ghost is keyed by event ID and cannot capture clicks.
- Result during sequence flash: cancel tint/turn effects, mount result; never play both result and sequence sounds.
- Replay during result/particles: cancel all prior-round animation and pending sounds immediately; remove ghosts, stale tooltip, hand selection, and result overlay. Never let a completion callback reopen old results.
- Resize/orientation change during a FLIP: cancel animation, recompute final geometry, preserve selected instance only if still legal. No coordinates are inferred from partially transformed DOM.
- Toggle animations off or OS reduced-motion becomes true mid-effect: cancel travel/particles; apply final state immediately; keep focus unchanged.
- Tab hidden: cancel decorative animation, preserve latest state; visible again uses the latest snapshot without catch-up animations.
- Connection loss: cancel speculative target dots and pending transitions that imply acceptance; retain last accepted board. If a move may already have committed, reconcile its receipt before allowing another intent.
- Menu opens during hand selection: preserve selection behind menu, no board clicks through it. Escape closes menu first; a subsequent Escape deselects.
- Turn changes during an avatar/name edit: editor stays open, hand disables; valid profile editing may finish. Round end closes ordinary edits according to §26.4.

### 25.5 Reduced motion and failures

If Animations off **or** OS/browser requests reduced motion, effective motion is reduced. User toggle cannot override OS reduced-motion in version 1; show `Reduced motion is enabled on this device` next to disabled on-state if needed in the menu.

Remove translation, scaling, rotation, FLIP, particles, and flashes. State changes immediate; popovers/toasts/results may use a 60 ms opacity fade. Keep the selected hand's final −6 px offset, applied instantly; it is a state distinction, not an animation. Sound preference remains independent.

If animation API is unsupported, use final styles immediately. Missing animation/audio APIs must not disable any gameplay path.

## 26. Complete interaction/state closures

### 26.1 Room and local-state machine

Server lifecycle:

```text
LOBBY --host start, valid roster--> PLAYING
PLAYING --target reached/draw--> FINISHED
FINISHED --one replay command--> PLAYING (new round ID)
LOBBY / PLAYING / FINISHED --expiry--> EXPIRED
```

New game creates a different room; it is not a transition back from PLAYING to LOBBY in the same room. Connection state and `allHumansAway` are orthogonal flags, not extra round phases. A paused unattended round remains PLAYING with scheduling suspended.

Local play state is exactly one of: `idle`, `selected(instanceId)`, `pending(commandId)`, `reconciling(commandId)`, `disabled(reason)`. It is derived from the accepted snapshot plus local intent:

| Event | Result |
| --- | --- |
| Local turn begins | Idle, unless an overlay remains open; no automatic card selection |
| Select legal/Jack/dead card | Selected; show eligible targets/helper |
| Select another | Replace instance ID; no network message |
| Valid target/Replace/Pass activated | Pending; submit once |
| Ack + matching/newer snapshot | Idle or disabled(other turn), according to authoritative state |
| Ack timeout | Reconciling; retain pending intent ID; fetch receipt/snapshot |
| Rejection | Idle or restore selected only if still held/current/legal; show error |
| Turn or round changes | Clear selection; derive new eligible state |
| Disconnect/lease revoked | Disabled; no buffered play intents |

Use an exhaustive discriminated union/reducer. Do not combine booleans that allow `selected && pending && canPlay` simultaneously.

### 26.2 Entry/loading/empty states

- Root homepage: dark neutral page, editable text `Childrex`, sentence `Play a game with friends.`, one **Play Sequence** link to `/sequence/`. No game room is created by visiting `/`.
- App bootstrap: dark app background, brand, text `Connecting…`; no fake board or fake players. After 10 s show Retry. Failure does not recursively allocate rooms.
- Failed guest/session creation: `Couldn’t connect. Try again.` Retry reuses bootstrap intent ID. If storage/cookies are unavailable, show `Allow cookies for this site to join a game.` Do not pretend refresh recovery will work.
- New lobby: creator only; two neutral teams; empty other team; no zero-player avatar placeholders pretending to be humans. Add computer/Invite friend remain visible, Start disabled with exact reason.
- Loaded room with missing fonts/assets: keep layout dimensions. Until critical card assets loaded, disable board play and show `Loading cards…`; retry failed resources once with cache revalidation, then show **Retry loading cards**. Never render a blank clickable card.
- Lobby with full team: omit Add computer; Invite friend still copies room invite but helper explains destination may differ. Fully full room disables all join CTAs for guests; existing participants can still copy code but explain room is full on hover/focus.
- Finished room cannot accept new participants; show `This round has finished. Ask a player to create a new game.` Returning members may view results/replay.
- All-away pause: server records pause; returning human sees snapshot immediately, then scheduling resumes. No modal requiring everyone's confirmation.
- Explicitly left: `You left the game`, Create game / Join game; no automatic room allocation loop.

### 26.3 Join input mechanics and stale lookup

One text input: `inputmode='numeric'`, `autocomplete='off'`, accessible label `Two-digit game code`. The two decorative cards mirror its two characters. Empty digits show a light en-dash; never default the actual input to `47` outside test fixtures.

- Pointer on either decorative card focuses the shared input; cursor/selection position nearest that digit. Backspace/Delete/left/right use normal text-input editing. Do not invent a custom keypad or prevent native paste.
- `maxlength` may be 2 only after normalized paste handling; pasted Childrex URL is parsed before replacing with its two-digit code. Accept ASCII digits; normalize full-width digits to ASCII; reject letters/extra digits. Never truncate six pasted digits to two silently.
- On every edit, cancel the prior lookup request and clear its success state. Requests also carry a local lookup generation counter; ignore older responses even if cancellation arrives too late.
- At length 0/1, show `Enter both digits`; no lookup. At length 2, debounce 300 ms. Submit while checking is disabled.
- Code lookup returns count/status only. The small avatar stack in the found-state design uses up to three **generic Avataaars preview illustrations**, not real room members' profile data. No names or hands are leaked by lookup.
- Enter the room only on explicit Join. Direct invite opening never abandons another game automatically.
- Back/close: return to caller's room; if no caller, return to `/sequence/` entry. A bootstrap-create suppression flag prevents Back after explicit Leave from creating a room unexpectedly.
- Joining own current room returns it idempotently, even if full/playing; it never reorders the seat. An old invite with mismatched room identity reports expired.

### 26.4 Overlay and form arbitration

Overlay enum: `none | menu | playerDetails | avatarPicker | rules | leaveConfirm | newGameConfirm | clipboardFallback`. Results are a room presentation, not a modal that fights this enum. New-game confirmed navigation mounts the lobby route; do not instantiate a second nested live room without a successful switch.

Only one of these overlays exists. Opening another replaces the current popover; it does not leave a hidden focus trap behind. Tooltip is suppressed whenever a modal is open, a profile input is active, or pointer is dragging/scrolling.

On a form submit, one pending request at a time:

- Avatar option click submits immediately; there is no unsent Save button. Closing while request is pending hides the picker but does not undo the submitted change; response still reconciles profile. Failure shows a nonblocking toast. Outside click before selection changes nothing.
- Name Enter/valid blur submits one draft; while pending no second save. If remote round end closes an unsent name editor, store draft in memory, do not auto-submit; toast `Name edit not saved` with **Edit** reopening it. A previously submitted request may finish normally.
- Escape on a valid unsent name draft cancels; invalid blur keeps the inline error but does not forcibly pull focus away from a modal. No trapped unusable input.
- Leave/New-game confirmation remains open on failure with original game intact. Close/Cancel while request pending is disabled until reconciliation; there is no promise to cancel a committed server action.
- Result arrives: close menu/details/rules/picker; invalidate selection. If leave/switch already pending, reconcile it first, then display the result only if still a member of that room. Do not navigate back into a room successfully left.
- Browser Back while play pending does not cancel the server command. Preserve its receipt ID for reconciliation; do not issue Leave unless the explicit Leave action is confirmed.

Focus return: avatar → triggering avatar; Menu → Menu; tooltip/details → player card; dialog → invoking button if still mounted, otherwise room heading. On replay/start focus the game heading, not a random card; keyboard user can then enter hand/grid deliberately.

### 26.5 Standard feedback copy and placement

Toast viewport: centered just above hand bar on game screens; centered above footer actions in lobby; 16 px away from safe-area edges. Max width 360 px, 12 px padding, 10 px radius, `#23262E` surface, `#E9EAEE` text, 1 px `#FFFFFF33` border. Pointer-events:none except dismiss/action controls. At most two visible toasts; newest replaces an older toast of the same category. No board-covering snackbar stack.

| Condition | Copy | Duration/location |
| --- | --- | --- |
| Clipboard success | `Invite copied` | 1,500 ms toast |
| No selected card | `Select a card from your hand first` | 1,500 ms hand helper |
| Invalid board target | `Choose a highlighted space` | 1,500 ms hand helper |
| Placement Jack blocked | `There are no open spaces for this Jack.` | While selected |
| Removal Jack blocked | `No opponent chips can be removed.` | While selected |
| Dead exchange used | `You’ve already replaced a card this turn.` | While selected + invalid action toast if needed |
| Sequence | `{TEAM} made a sequence` | 1,800 ms, not modal |
| Replay by another | `{NAME} started a new round` | 1,500 ms |
| Preferred join team full | `Joined {TEAM}; your requested team was full.` | 2,500 ms |
| Host changed | `{NAME} is now the host` | 2,500 ms |
| Computer takeover | `Computer is covering {NAME}` | 2,500 ms + persistent player status |
| Reclaim success | `You’re back in control` | 1,500 ms |
| Reconnecting | `Reconnecting…` | Persistent slim connection banner |
| Maintenance | `Updating the game. Reconnecting shortly…` | Persistent banner, commands disabled |
| Recoverable request error | Specific §16.4 copy | 4,000 ms toast; inline for forms |
| Codes exhausted | `All game codes are in use. Please try again shortly.` | Persistent entry error + Retry |

For empty-name error use `Enter a name.`; length error `Use 24 characters or fewer.`; disallowed control characters `Use a single-line name.` Preserve user input for correction. Avoid alarming red animations, shake effects, and error sounds.

### 26.6 Player counts, ownership, and copy

- `N of 12 joined` includes humans and original computers in lobby. A disconnected reserved human still counts until removed.
- Team counts reflect roster entries. In two-team example with three people, Start is disabled; the balanced `m3-lobby-copy-2` is the enabled fixture.
- Host subtitle may say `Tap a player to move them across`; non-host subtitle says `Tap your player card to switch teams`. Do not suggest permissions the viewer lacks.
- Two-team tagline: `2 TEAMS · TWO SEQUENCES TO WIN`; three-team tagline: `3 TEAMS · FIRST SEQUENCE WINS`.
- Player status precedence: disconnected/covering > current turn > up next > team. Team remains in details and color indicator if the subtitle is used for status.
- Current-turn text is `Your turn` for local human, `{NAME}’s turn` in the compact global status, and `Playing` on another current player's card. Computer current status is `Thinking…`.
- Terminal header has team labels only; no Your turn/Up next. Result title: own winning team `You win!`; other winning team `{TEAM} wins`; draw `Draw`. Subtitle for own win `Your team completed {N} sequence(s).`; loss `{TEAM} completed {N} sequence(s).`; draw uses explicit reason. Score is round sequences, not lifetime wins.
- Host cannot kick connected human participants in version 1. Moving them in lobby is allowed by P02; removing human seats occurs only on their explicit Leave or lobby disconnect expiry. Do not expose an undocumented Remove player action.

### 26.7 Responsive implementation closure

Breakpoints are proposed layout defaults: wide ≥1,024 CSS px; compact 600–1,023 px; narrow <600 px. Choose based on viewport width; board inspection threshold separately uses actual rendered board width <600 px.

- Wide game: top 88 px, bottom 112 px, region gap target 20 px. Compact landscape with height <700: top 64 px, bottom 88 px, region gap 12 px. Narrow portrait: top 96 px (48 primary + 48 roster), bottom 112 px; region gap 12 px. Apply safe-area insets outside these content heights.
- Board scale `s = min(availableRegionWidth/998, availableRegionHeight/800)` after gaps; do not cap at 1 on larger screens. Center it in the region. Width includes 16 px page inset on narrow/compact, 24 px on wide, unless a stricter height limit wins.
- Hand base size 62 × 87.07 wide/narrow; compact-short size 48 × 67.41; gaps 12 px wide, 8 px otherwise. No card overlaps another in the hand. Scroll horizontal overflow with 12 px side padding; selected lift is never clipped. No page-wide horizontal scrollbar.
- Narrow inspection: first target tap opens a full-screen dialog containing the same board at scale `max(1, 44/68.57237)`; board typically scrolls horizontally/vertically. Center the tapped cell in the scroll viewport. Show selected hand card plus **Close** in a 64 px footer, with the rest of hand available via horizontal scroll if player changes selection. A second legal cell activation commits once and closes inspection on accepted state; failure stays open with corrected state. Never commit on the tap that opened it.
- On narrow view, Expand board opens the same dialog without committing anything; keyboard focuses last cell or first cell. Pinch zoom remains native; no `user-scalable=no`. Pointer movement >8 CSS px is a pan/scroll gesture, not a cell click.
- At 600–1,023 lobby width, keep two panels side-by-side only when each can be ≥260 px; otherwise stack. Three panels stack below 1,024. On stacked panels, add-team control overlaps the first/second panel boundary centered horizontally, with the same ring and no label.
- Roster inside a team panel: max visible content height 340 px with internal vertical scrolling for six players; keep heading/footer actions outside scroll. Do not let players cover Start.
- Name keyboard on phone: allow visual viewport to resize/scroll active input into view; temporarily let lobby/dialog scroll. Do not resize/rotate card artwork in response to each virtual-keyboard frame. Closing keyboard restores normal layout.

These mobile extensions are completely specified but remain P05, not a claim that mobile Canvas frames were approved. Validate their usability before public release; do not alter the desktop mockups to look like them.

## 27. Consolidated visual tokens and asset manifest

### 27.1 Color and typography tokens

Reference colors are taken from the active design; new state colors are marked P (proposed fallback). These values resolve missing developer choices but are not a new palette redesign.

| Token | Value | Basis/use |
| --- | --- | --- |
| `page` | `#14161A` | Reference app/lobby background |
| `bar` | `#1B1E24` | Reference top/bottom game bars |
| `surface` | `#23262E` | Reference active player / P dialogs |
| `menuButton` | `#292D35` | Reference Menu surface |
| `surfaceHover` | `#303540` | P neutral button hover |
| `surfacePressed` | `#383E49` | P neutral button pressed |
| `text` | `#E9EAEE` | Reference primary text |
| `textBright` | `#FFFFFF` | Reference lobby/headline text |
| `textMuted` | `#A5ACB8` | P neutral secondary copy |
| `subtleBorder` | `#FFFFFF33` | Reference neutral team panel / controls, 1 px inner |
| `handRestBorder` | `#2C3038` | Reference hand outline |
| `boardSurface` | `#C3C7CC` | Reference board |
| `boardOuterBorder` | `#7D828A` | Reference 1 px outside board edge, not card borders |
| `boardCaption` | `#626870` | Reference board words/captions |
| `blue` / `red` / `green` | `#2F6BFF` / `#E5484D` / `#30A46C` | Reference team colors |
| `blueTarget` | `#92B5FF` | Reference legal-target outline |
| `redTarget` | `#F4A1A4` | P light-red legal-target outline |
| `greenTarget` | `#98D1B5` | P light-green legal-target outline |
| `completion` | `#36B87A` | Reference completed-card outline, same for all teams |
| `lastMove` | `#F5C451` | Reference current/last move gold |
| `primaryAction` | `#FFC53D` | Reference Start / Join action |
| `primaryActionText` | `#1D1F3A` | Reference text on yellow |
| `modalBackdrop` | `#080B1280` | P regular modal backdrop; Menu uses none |
| `resultBackdrop` | `#080B12B8` | Reference result board dim |

Reference type scale: brand Jost 28/400/−1.3 px tracking; lobby heading Jost 56/400/1.0 line-height/−1.5 tracking; join heading Jost 60/400/1.0/−1.5; team names Jost 44/400/1.0 (reduce to 36 in compact panel); primary button Inter 18/700/1.2; player lobby name Inter 18/700/1.2; header player Inter 13/600/1.2; header status Inter 10/500/1.2; body/help Inter 16/400/1.5; error/helper Inter 14/500/1.4; code badge Jost 56/500/1.0. CODE label Inter 11/700, letter spacing 2.5 px. Narrow lobby heading 36, join heading 36, team name 30, body 16. Preserve readable browser zoom.

CSS fallbacks: `Inter, system-ui, sans-serif` for body; `Jost, system-ui, sans-serif` for display. Self-host WOFF2 files with their license notices; preload only Inter regular and Jost regular, load other weights normally. Use `font-display:swap`; visual-test harness waits for `document.fonts.ready`. Do not wait on fonts to establish a session.

Test actual text contrast on the composited surfaces. A contrast failure is a documented visual-review issue requiring a narrowly scoped approved correction; do not silently change the team's color or the owner's whole palette. Accessible names and noncolor status markers are required regardless.

### 27.2 Dimensions, layers, and cell mapping

All dimensions below are reference CSS px before responsive board scaling.

| Element | Dimensions / behavior |
| --- | --- |
| Board outer | 998 × 800; radius 3; 1 px outer edge; `0 14px 30px -6px #00000066` shadow |
| Display card shell | 96.191797 × 68.572370; radius 2.080272; SVG portrait art 68.572370 × 96.191797 rotated 90° around center |
| Display grid origin | Board-local `(8.0000,47.152842)` |
| Display column pitch | 98.410754 |
| Display row pitch | 70.791327 |
| Cell position | `x=8+displayColumn*98.410754`, `y=47.152842+displayRow*70.791327` |
| Board chip | Diameter 28.8004; center in cell; no human-photo sprite |
| Board selected/completed stroke | 1 px inset; no layout participation |
| Hand | 62 × 87.07, radius 4; 1 px neutral/raw-team border; gap 12; selected shift −6 |
| Header player | Base width 110, height 48, padding 7/11, gap 9, radius 11; long-name fixture can use 144 wide; scroll rather than overlap |
| Header avatar | 34 × 34; Avataaars clipped circular; team ring 1.5 px |
| Lobby avatar | 46 × 46; circular; same profile identity across views |
| Menu | 240 wide; 8 px padding; each row 40 px; radius 12; offset 8 below button, right aligned |
| Avatar picker | 368 wide desktop, 16 px padding, 6 columns of 44 px options with 12 px gap; on phone 4 columns, dialog ≤viewport−32 |
| Tooltip | 220 maximum width, 12 px padding, 8 px radius, 8 px offset; wrap full name |
| Neutral/colored team panel | 528 × 500 in two-team desktop, padding 28, gap 14, radius 28; three-team width 340 |
| Add-team control | Visible circle 84 diameter, ring 116 diameter centered at seam; preserve outline, no label pill |
| Invite badge | 120 × 120 circle, 4 px ring; CODE/47 typography above; action remains copy |
| Main lobby footer buttons | Height 68; radius 18; Start width 280; Join-other fit-content with 22 px horizontal padding |

Calculate board positions from the shared logical/display mapping, not from DOM readback. Fractional pixels are allowed. A 1 CSS px state stroke remains 1 CSS px at normal responsive sizes instead of becoming a thick zoomed wrapper; when the user browser-zooms the entire page it scales naturally with the page. Keep base radius proportional to board scale. Retain square-fit geometry rather than resampling PNGs.

Layer order (ascending): base artwork 0; completion/valid outline 1; chip 2; last-move marker 3; keyboard focus 4; board helper 10; sticky bars 20; tooltip 40; menu/picker 50; backdrop 80; modal 90; toast 100. Result dim is between base game and result highlights/footer (60/61/62), while Menu invoked from results is rendered above them (70). When a true modal opens on results it still uses 80/90. All purely visual overlays have `pointer-events:none`.

State perimeter priority: focused visual aid is separate outside; completion outline wins over legal-target outline on protected cards; legal-target state only appears for eligible empty/removable cells. Last-move marker is centered on chip/empty cell and never replaces the card perimeter. Hand selection is only raw team color, never pastel. Do not change this to fix an unrelated contrast issue.

### 27.3 Asset production checklist

Cards: one retained SVG for each of 52 face codes, plus two backs for possible placeholders; exclude jokers from the engine. Source `card-assets/svg cards/card fronts/<suit>/...`; rename only the copied application asset to canonical `AS.svg`, `TC.svg`, etc. Asset preparation reads the original, removes active/external-resource content if any, verifies `viewBox`, and preserves artwork. Keep SHA-256 in `assets-manifest.json` and the local CC0 LICENSE/README provenance. Never overwrite the original library.

Avatars: use Avataaars generation seeds `sequence-preview-0` through `sequence-preview-23` in that order for IDs `avataaars-01` through `avataaars-24`. The first four are the existing Canvas study's source examples. Freeze generated SVG bytes in the repository; record source style, seed, retrieval/generation version (or dated API source if no resolved version is returned), and SHA-256. A future upstream avatar change must not alter existing profiles automatically.

Initial generation can use the previously researched DiceBear HTTP generation endpoint with `avataaars` and URL-encoded seeds; generation is a build/preparation action, not a production network request. Use the generated assets locally thereafter. Each profile sends only its allowlisted asset ID. A missing avatar falls back to the first bundled Avataaars asset, then a neutral initials circle only if all avatar assets fail; it does not switch to another avatar style.

Corner medallion: export retained editable four-suit symbol geometry from the current board. No traced product photograph. Fonts: pin actual downloaded font files and notices; no Google Fonts call on every game load. Audio: exact synthesized recipes §24; no additional sample licenses needed. `THIRD_PARTY_NOTICES.md` lists card deck, DiceBear code if included in preparation, Avataaars design, fonts, and any icons used.

## 28. Game/protocol edge-case closure

### 28.1 Turn order, seats, and controller identity

Store `teamTurnOrder` independently of `teamDisplayOrder`. With two teams, team turn order is A,B. Adding the third middle visual panel C appends C to turn order: A,B,C, even though panel order is A,C,B. This matches the six-player reference's You → Diego → Kofi → Amara → Priya → Computer order while preserving the middle green panel.

At start, build seats round-robin by roster index: for each roster position, append each team in `teamTurnOrder`. Examples: A=[You,Amara], B=[Diego,Priya] → You,Diego,Amara,Priya. A/B/C with two each → A0,B0,C0,A1,B1,C1. Dealer is randomly selected index; `currentSeatIndex=(dealer+1)%seatCount`. Header order follows this immutable round order, not arbitrary join order or color-sort order. Color changes never affect it. Replay rotates dealer on the same order.

Original computers have `guestId=null`. A disconnected human being covered keeps their guest ID, name, avatar, and `reclaimable=true` with `controller='computer'`. Explicit Leave detaches guest membership, sets guestId null/reclaimable false, and changes display name to `Computer N` for future live roster status; completed historical result names remain a frozen round summary. Never hand a different person the departed player's private hand through name matching.

Presence of any read-only duplicate tab does not count as controlling human presence for takeover. When the last controlling human leaves, pause bot jobs even if read-only tabs remain. The owner of a temporarily covered seat may still see their own hand after authenticating, but cannot send play commands until control is reclaimed.

### 28.2 Legal-action and scoring boundaries

- A corner is never a place/remove target. It remains shared and protected independently of team sequence records.
- Ordinary card with both board positions occupied is dead regardless of whose chips occupy them or whether those chips are protected. A temporarily blocked Jack is not a dead ordinary card.
- Exchange validates the card instance, dead condition, actor, turn and allowance. It consumes no turn-ending action and replaces the same slot. An accepted exchange increments round version; a previously prepared play against the old version must resync.
- A removal action cannot itself award a sequence to any team; only place actions call sequence detection. Removing a chip never subtracts a completed score because completed chips cannot be removed.
- Candidate window comparison is numeric cell index `row*10+col`, zero-padded to two digits for lexical keys. Sort each five-index key; compare full key lists. This avoids string ordering such as 10 before 2 accidentally changing the tie-break.
- Bot legal-action enumeration uses a rules helper accepting `BotObservation`/own hand and public board, not a full-state reference. Public simulation places/removes only a chip and scores windows; it does not simulate an unknown draw from the real deck. For each opponent, enumerate empty cells where a hypothetical placement would reach their winning target; count distinct `(opponentTeamId,cell)` pairs. The winning-threat score is countBefore minus countAfter. Next count distinct unblocked five-cell windows with four occupied-friendly/free positions and one empty, excluding windows incompatible with protected records; score that reduction separately. Own potential gain is the sum of §11 weights after minus before. Final tuple is `[wins?1:0,newSequences,winningThreatReduction,sequenceThreatReduction,ownPotentialGain,-jackSpent]`; highest lexicographic tuple wins. Negative reductions are allowed. If multiple cards make the same move, evaluate each instance but prefer a normal card through the final term when prior terms tie.
- The terminal action still draws its replacement according to §10.2, then locks game. Current seat index becomes null; last actor stays in `lastBoardMove`. No subsequent bot timer is scheduled.
- No manual score correction, undo, surrender, or team forfeit button. Explicit departure means computer replacement, not an automatic opponent win.
- If engine invariants fail unexpectedly, stop accepting commands for that room, persist sanitized incident metadata, and show `This game needs to reconnect. Your last saved move is safe.` Resync/reload from last committed snapshot; never repair by fabricating cards or scores. If recovery fails, keep room read-only with New game available and log the incident.

### 28.3 Exact public snapshot boundary

```ts
interface ViewerSnapshot {
  protocolVersion: 1;
  roomId: string; roomVersion: number; serverTime: string;
  phase: 'lobby'|'playing'|'finished'|'expired';
  code: string; hostSeatId: string|null;
  teamDisplayOrder: string[]; teamTurnOrder: string[];
  teams: PublicTeam[]; seats: PublicSeat[];
  yourSeatId: string|null; canControl: boolean;
  round: null | {
    id: string; version: number; boardVersion: 1;
    turnId: string; turnOrder: string[];
    currentSeatId: string|null; nextSeatId: string|null;
    chips: (string|null)[][];
    sequences: SequenceRecord[];
    lastBoardMove: LastBoardMove|null;
    drawCount: number; handCounts: Record<string,number>;
    result: null | {winnerTeamId: string|null; reason: string;
      scores: Record<string,number>; participants: ResultParticipant[]};
  };
  yourHand: {instanceId:string; face:string}[];
  yourActions: {play:{instanceId:string; kind:'place'|'remove'; cells:Cell[]}[];
    exchangeInstanceIds:string[]; canPass:boolean};
  latestPublicActions: PublicAction[]; // max 20, no drawn card faces
  notices: {eventId:string; type:string; message:string}[];
  delivery: 'live'|'initial'|'resync';
}
```

`PublicTeam` includes ID/color/seatIds only; `PublicSeat` includes ID/team/name/avatar/host flag/controller/presence/grace deadline/last public action, never guest credential or private lease. Result participant summaries use names/avatar/team at finish so later new-game/profile changes do not rewrite who won. `yourHand=[]` outside an authorized seat; `yourActions` empty unless permitted to act. For a finished authorized participant their own hand may remain in snapshot but is hidden by result presentation; it is never revealed to opponents.

`PublicAction` includes event ID, sequence index, round/turn ID, actor seat, played face, action kind, affected cell if any, and resulting public score. No drawn face, deck order, random seed, or other hand. Dead-card exchange exposes only discarded face and that an exchange occurred. Keep gameplay-private event information out of public event storage.

Each room mutation increments roomVersion; only gameplay actions/start/replay increment or establish roundVersion. Presence and profile updates can increment roomVersion but do not invalidate expectedRoundVersion. Personal control metadata can change with same roomVersion; apply it with a separate `controlEpoch` from the control endpoint. A client applies a larger roomVersion; if equal, only explicitly newer controlEpoch metadata may replace lease state. Round IDs are opaque, not lexically ordered.

### 28.4 HTTP bootstrap, leases, and receipts

- `POST /guest`: an exception to requiring a preexisting CSRF token because it bootstraps one. Require allowed Origin, JSON content type, no permissive CORS, and creation rate limits. Reuse valid existing cookie; return public profile and a CSRF token. Do not rotate/revoke a valid guest just because this endpoint is retried.
- Session token: 32 cryptographically random bytes, base64url cookie. Store SHA-256 token hash and expiry server-side; constant-time compare where applicable. Cookie `HttpOnly; Secure; SameSite=Lax; Path=/sequence/`, production only over HTTPS. Local HTTP development can omit Secure in explicit development configuration, never production.
- CSRF token: HMAC-SHA256 of server session ID using a required server-only 32-byte secret; return only to the authenticated same-origin caller. State-changing authenticated HTTP requests carry `X-CSRF-Token`; reject absent/mismatched tokens. Socket handshake sends the same proof and validates Origin.
- `PATCH /profile` works before room creation and requires only valid guest session/CSRF, not a room control lease. `profile.update` in-room delegates to this same service and broadcasts if membership exists. Another guest cannot select target guest ID.
- `POST /rooms/:id/control` authenticates membership, CSRF and a client-generated tab ID; claims free control or explicitly takes over when `{takeOver:true}`. Return leaseId/controlEpoch. This bootstrap endpoint does not require the new lease before creating it. `seat.takeControl` is shorthand for the same operation, not a circular lease-protected command.
- Socket reconnect reuses tab ID and requests lease resume. Server-issued lease identifies tab authority, not private identity. Old revoked leases cannot send commands; read-only snapshot access for the same guest is still permitted.
- Receipt lookup authenticates same guest and retained room access; accepts a lost lease because it is read-only. Return `accepted` with prior ack, `rejected` with prior structured error, or `unknown`. Do not leak whether another guest used that command ID.
- Client persists only pending command ID/roomId/roundId/type in sessionStorage, not entire hand or session cookie. After refresh inspect receipt and full snapshot before submitting anything else. Unknown does not prove a command never arrived; retry the **same** still-valid intent ID or remain reconnecting until its state is resolved. Do not submit a new target automatically.
- Keep command payload hash and accepted/rejected receipt until room data purge. A receipt is scoped by actor/room/command ID. Deduplicate lookup before expected-version checks but after authenticated access checks.
- For profile edits, use a profile mutation ID for idempotency even outside a room. Last server-accepted profile version wins; stale draft sends expectedProfileVersion and gets conflict instead of overwriting a newer tab's update silently.

### 28.5 Allocation, room switch, expiry, and disconnect timers

Use a `room_codes` table containing exactly strings `00`…`99`, with nullable assigned room ID and `reusableAfter`. In a single write transaction choose randomly among free eligible rows; assign one. No free row → `CODES_EXHAUSTED`. This enforces live-plus-quarantine capacity, unlike a uniqueness check on live rooms alone.

On room creation store immutable creation-command receipt; double initialization cannot allocate two codes. If a previous creation ID points to an expired room, return `ROOM_EXPIRED` and prompt explicit Create new with a new ID; do not reuse it to allocate silently.

One guest has at most one active membership. Cross-room switch locks source/destination in stable UUID order and validates target capacity, room identity, started/finished status, membership, and expected source room version before committing. Creation switch also reserves a free code in that transaction. On any failure roll back all changes, including tentative code allocation. Existing code exhaustion cannot force a guest out of their old game.

Expire only if no controlling human connected **and** at least 24 hours have elapsed since the latest human connection/accepted human command/disconnection timestamp. While a connected idle human remains, it does not expire underneath them. Explicit leave of the last human with no other reclaimable human remaining can expire the abandoned room immediately; release code only after quarantine. System/bot actions never extend human activity.

Timers use server monotonic elapsed scheduling plus persisted wall-clock deadlines for restart recovery. Socket heartbeat proposed values: ping every 10 s, timeout 10 s; grace starts when disconnection is detected, not from the user's earlier physical cable pull. UI countdown uses server deadline/serverTime delta, clamp at zero; only server actually replaces/removes a player.

Server restart grace: mark human sockets disconnected at restart, permit at least a fresh 30 s reconnect window before any takeover of a formerly connected seat; preserve a longer existing unexpired grace if present. Do not consider an unattended server restart a human move, room activity extension, or reason to redeal. No bots run until a controlling human has reconnected.

All room queues must guard profile/host/leave/replay races. A replay request from an actor whose membership was removed first fails NOT_MEMBER; a leave processed after replay leaves the new round normally. A late start against an edited roster version fails STALE_STATE. There is no partial start with some clients in a different roster.

### 28.6 Additional error codes

Add these to the §16.4 union: `CODES_EXHAUSTED`, `TEAM_FULL`, `COLOR_REQUIRED`, `INVALID_NAME`, `INVALID_AVATAR`, `INVALID_CODE`, `INVITE_EXPIRED`, `NOT_MEMBER`, `ROOM_FINISHED`, `PROFILE_CONFLICT`, `COMMAND_ID_REUSED`, `MAINTENANCE`, `ROOM_RECOVERY_REQUIRED`. Use 400 validation, 401 no valid session, 403 authorization/CSRF, 404 inaccessible/missing resource, 409 state/version/capacity conflict, 429 limits, 503 maintenance/unavailable. Socket acks carry equivalent code without HTTP status dependence.

Messages are deterministic text mapped client-side by error code, with only escaped validated parameters (team/name/count). Unknown code: `Something went wrong. Please reconnect.` No raw server exception text in toasts.

## 29. Concrete delivery contracts and operational configuration

### 29.1 Required scripts and build behavior

Root scripts to implement: `dev`, `lint`, `typecheck`, `test`, `test:engine`, `test:server`, `test:e2e`, `test:visual`, `build`, `verify`, `assets:verify`, `db:migrate`, `db:backup`, `db:restore:test`. `verify` runs lint → typecheck → unit/server tests → asset verification → build → e2e; visual baselines are reviewed, not auto-updated on CI failures.

`dev` serves web on localhost:5173 with `/sequence/api` and `/sequence/socket.io` proxying to backend localhost:3000. Production serves both app assets and APIs on the single internal port 3000. No production dev server, wildcard origin, browser-exposed API secret, or dependence on a developer's local files.

Commit lockfile, migrations, schema versions, source SVGs, avatar manifest, notices, Dockerfile, scripts, and this specification in `docs/`. Test fixtures exist only in test/story routes excluded from the production bundle; no public endpoint can set a hand or force a win.

### 29.2 Environment/config manifest

| Variable/config | Production value/validation | Secret? |
| --- | --- | --- |
| `NODE_ENV` | `production` | No |
| `PORT` | `3000`, internal only | No |
| `PUBLIC_ORIGIN` | Exactly `https://childrex.com` | No |
| `BASE_PATH` | `/sequence` without trailing slash | No |
| `DATABASE_PATH` | `/data/sequence.sqlite` inside mounted volume | No |
| `CSRF_SECRET` | Required 32 random bytes encoded as 64 hex characters | Yes |
| `TRUSTED_PROXY_CIDRS` | Exact inspected proxy subnet/address range, not `true` or `0.0.0.0/0` | No |
| `LOG_LEVEL` | `info`, structured redacted logs | No |
| `BUILD_SHA` | Immutable full git commit SHA, injected by release | No |
| `VIRTUAL_HOST` / `VIRTUAL_PORT` | `childrex.com` / `3000` | No |
| `LETSENCRYPT_HOST` | `childrex.com`, matching existing companion conventions | No |
| `LETSENCRYPT_EMAIL` | Owner's existing certificate contact, inspected privately | Personal config |
| Image reference | `ghcr.io/emmanuelpenkra/childrex-sequence@sha256:<digest>` | No |

Runtime fails readiness with a sanitized config error if required configuration is invalid. It must not silently fall back to an insecure production cookie or wildcard Origin. `.env.example` has placeholders, never a real secret. This plan intentionally does not invent deployment secrets, certificate email, or server IP; obtaining those is execution, not an unresolved product design.

### 29.3 SQLite and deployment details

Use WAL, `foreign_keys=ON`, `busy_timeout=5000`; serialize application write transactions. On runtime startup verify schema/asset manifest, restore room actors without scheduling bots, then become ready. DB directory owned by app UID 10001, files not world-readable. Container root filesystem read-only except `/data` and temporary `/tmp`; drop Linux capabilities and set no-new-privileges. App has no SSH keys or GitHub token.

Database migrations have numbered immutable files and a transaction where SQLite supports it. Deployment runs migration before traffic enable. Use only additive/backward-compatible changes for routine auto-release; destructive migrations require an explicit separately reviewed plan and backup/restore test. A script must never infer that `DROP TABLE` is okay because it is a “new version.”

Deploy helper interface is two fixed subcommands: `deploy <sha256-digest>` and `rollback <known-release-id>`. Validate digest format and fixed repository prefix; do not accept arbitrary image names, shell flags, paths, or Compose files from runner input. Helper/config/scripts are root-owned and not writable by the runner. A runner-triggered deploy cannot edit the helper itself. Refuse deploy if free root disk <10 GiB; abort before stopping old app.

Ready smoke check uses separate temp DB and no `VIRTUAL_HOST` labels, so the shared proxy cannot route users to it. Deploy only one production writer. New production container initially has command acceptance disabled until DB/load/readiness checks pass, then enable commands; rollback window must close before users can commit post-migration moves. Record previous image digest and schema version in root-owned release metadata.

Graceful shutdown: set draining, emit maintenance notice, reject new mutations with MAINTENANCE, wait at most 10 s for queued accepted transactions to finish, close sockets, close DB, exit. Container stop grace 20 s. Crash recovery relies on committed transactions, not shutdown success. Health endpoints never include room/member/session details.

Daily consistent DB backup at 03:00 server-local time, retain seven; after successful deploy retain a predeploy backup as one additional bounded artifact until next successful release. Backup file permissions 0600. Logs rotate at 10 MiB ×3 files per container. Never run cleanup outside the exact Sequence directories/container/image labels. Do not add an offsite paid backup service or purchase anything implicitly.

### 29.4 Test fixture manifest

Provide deterministic fixture builders (not arbitrary hardcoded screenshots):

| Fixture | Required state |
| --- | --- |
| `lobby-neutral` | Owner A + two invited people as reference; both colors null; Start disabled |
| `lobby-two-unbalanced` | A two humans / B one; selected colors; disabled reason |
| `lobby-two-ready` | A two humans / B human+computer; Start enabled |
| `lobby-three-ready` | Three teams of two; six seats; permitted turn order |
| `join-empty/loading/found/error` | Two-digit input states; generic preview stack |
| `game-rest` | Four seats, six cards; no unrecorded completed line |
| `game-selected-9H` | Same state with both specified logical 9H cells empty; raw hand/light board outlines |
| `opponent-last-place` | Diego current, Amara next; local hand 0.78; previous move gold |
| `opponent-last-remove` | Last cell empty with removal marker |
| `sequence-continues` | Exactly one registered blue sequence, no winner, next player actionable |
| `two-team-win/loss` | Two compatible stored sequences, exact nine/ten union cells; terminal |
| `three-team-win` | One five-cell stored sequence; six seats, five-card hands |
| `draw-no-moves` | Validated forced-pass cycle, explicit draw reason |
| `jack-place/remove/dead` | Targets and helper states, no protected removal |
| `profile-edit/picker/tooltip` | Focus and local-only interaction states |
| `reconnecting/takeover/reclaim` | Deterministic server clock/deadlines |
| `menu/rules/leave/new-game` | Every overlay, default/cancel/pending/error |

Fixture builders must run through engine invariants; a visual fixture may arrange a late-round state directly but must contain consistent card inventory, protected sequences, turn counts, and private projections. Freeze virtual clock, RNG, fonts, and asset hashes in screenshot tests. Do not call external avatar APIs in CI screenshot runs.

## 30. Final verification matrix and plan handoff

### 30.1 Additional sound/motion tests

- S01: first visit sound disabled; every game action silent until opt-in.
- S02: successful enable plays one preview; rejected/suspended context never causes uncaught error or queued burst.
- S03: exact oscillator frequencies/offsets/envelopes match §24; offline-rendered output length correct, no clipping/nonfinite samples.
- S04: placement+sequence+win same command produces only result cue; non-winning sequence+local turn follows explicit 40 ms gap.
- S05: duplicated live event emits one cue; reconnect/initial/resync emits none.
- S06: hide tab/mute/revoke lease cancels active/pending sound; returning visible does not replay old cues.
- S07: two tabs of same guest produce at most one cue stream; different human guests independently control their own preferences.
- S08: no sounds for invalid actions, selection, menus, profile edits, errors, or background events.
- M01: exact timing/easing values use centralized constants; no duration ranges left to choose.
- M02: selecting A→B→A during lift preserves one selected instance and final −6 px position.
- M03: replay during result flourish removes all prior-round decoration and never reopens old results.
- M04: accepted next turn is interactive during sequence animation; no animation-end event mutates game state.
- M05: reduced motion applied mid-animation snaps to correct final state; no particles/travel afterward.
- M06: rapid place/remove and orientation change cancel old effects without ghost hit areas.

### 30.2 Additional contract/usability tests

- C01: two-digit `00` is accepted as string; invalid longer code rejected, never truncated or lengthened.
- C02: exhausted/quarantined 100-code pool rejects creation without abandoning current room.
- C03: old invite's room-ID mismatch cannot join a later room reusing its code.
- C04: code lookup reveals count/status only; generic avatar illustrations do not expose member profiles.
- C05: profile edit before membership works through authenticated profile endpoint, no lease bootstrap deadlock.
- C06: lost-ack receipt lookup works after lease replacement for same guest, not another guest.
- C07: start/replay/leave/host-migration races leave one consistent phase, roster, and controller.
- C08: complete all overlays with keyboard; Escape hierarchy/focus restoration follows §26.4.
- C09: two-team and three-team round-robin match reference ordering even though display order differs for middle third team.
- C10: regular disconnected grace, server-restart grace, all-away pause, and room-expiry clocks are tested separately.
- C11: color tokens/reference strokes have no unapproved CODE/format/heading changes; neutral red/blue borders match.
- C12: both join-title duplicates and accidentally seven-card four-player fixtures remain absent.

### 30.3 Load and operational test target

Before production acceptance, run a 15-minute test of 25 simultaneous rooms ×8 seats =200 seats, with 100 human-simulated socket clients and 100 bots. Pace human actions at one per 2 seconds when their turns occur; use realistic room state, not concurrent invalid play floods. Track p95 handler ≤50 ms, no invariant/duplicate-command errors, application memory below 512 MiB cap, bounded logs, and successful reconnection of all 100 clients after one app restart. This is a test target, not a claim of achieved capacity. If it fails, optimize or lower configured room admission cap; do not silently raise shared-server resource limits.

Separately run 100 concurrent lookup requests to verify rate limits and no sensitive data; inject delayed/reordered/duplicate command responses; simulate DB unavailable/disk pressure before deploy and assert old deployment stays healthy. Do not run a destructive disk-full test on the shared production server—use a bounded isolated test filesystem/container.

### 30.4 Completion criteria for this plan versus the application

**Plan complete:** every in-scope control has a trigger, permission, state change, failure path, feedback, and test; sound recipes/eligibility are explicit; animation timings/cancellation are explicit; board/rules/data/hosting strategy are specified; owner choices versus defaults are visible; no temporary rejected code design remains normative.

**Application complete:** all §20 and §30 implementation tests actually pass, visual comparisons are reviewed, real multi-client games work, and the domain is deployed through the verified pipeline. This has not happened merely because the plan is finished.

**No required product question remains to finish this document.** The owner may revise proposed defaults before implementation. Operational values (tokens, server IP, certificate contact, GH runner registration and optional 2FA) must be obtained safely when executing deployment; never fabricate them in a plan.

Deliver this Markdown as the canonical specification, preserve the decision register with it, and include it in the future repository's `docs/`. Do not describe unfinished application code or speculative Canvas states as delivered implementation.

### 30.5 Specification audit performed

Final drafting audit checked: all 30 numbered chapters present and ordered; section references resolve; fenced examples are balanced; board has exactly 100 cells, four proper corners, and 48 non-Jack faces each twice; generated five-cell-window count is 192. The document contains 79 named acceptance scenarios across engine, networking, UI, deployment, audio, motion, and contract groups, plus the load-test protocol.

Manual consistency pass reconciled: two-digit code/CODE label restoration; ready-lobby frame map; measured green/red/completion tokens; profile-before-room authentication; control-lease bootstrap; personalized snapshots versus lookup previews; team display order versus alternating turn order; result/replay/new-room differences; background audio/animation cancellation; backup retention versus data expiry; and proposed defaults versus owner decisions.

These are **specification checks only**. The listed application acceptance scenarios have not been executed against a built game. No repository, runner, DNS, or production deployment was created by this final planning pass, and no additional Canvas redesign was applied.
