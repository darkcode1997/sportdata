# Match scoreboard

Open **CMS → Sự kiện → Trận đấu**, then select the **▶ Bảng điểm** button. The screen at `/cms/matches/[id]/scoreboard` follows `scoreboard.html`: two rows occupying 80% of the screen, red/cyan totals, and a centered clock occupying 20%. Each row shows the athlete's avatar, name and unit, and retains Submission, its counter, the horizontal 1P–4P penalty buttons, and the vertical 2/3/4 point buttons. Match controls use keyboard shortcuts; the floating control panel has been removed.

## Operating a match

1. Schedule two distinct athletes, an FOP, and a start/end time. Both feeder matches must be finished. The start time must have arrived, the FOP and athletes must be free, and scheduling/rest constraints must pass. A notice explains any blocker.
2. Press **Space** to start. Opening the screen alone does not start a match.
3. Click the vertical **2/3/4** buttons to record points. Use **1P → 2P → 3P → 4P** to record successive penalties: completed stages stay lit for each athlete independently, and only the next stage can be entered. Click the advantage counter to add an advantage, or **Submission** to record a submission. **Right-click**, **U**, or **Ctrl/Cmd+Z** reverses the latest active award; the original stays in the history. Submission pauses the clock and proposes the submitting athlete as winner, requiring explicit confirmation to save.
4. Press **Space** to pause/resume as directed by the referee. The clock is saved on the server and survives reloads. Network loss disables controls; elapsed time continues from the saved timestamp. Zero time does not automatically finalize the result.
5. At zero time, press **R** to open result confirmation. Submission, 4P and reaching 50 points open it automatically. Check the winner and method, then confirm. The popup selects the server-calculated winner by athlete ID and follows updated results. Conflicting winner choices are unavailable, and the win method follows the calculated outcome. If every tie-break is equal, the referee must choose a winner using **Quyết định trọng tài**. Saving waits until that athlete's name is loaded. Result saving and winner/loser destination updates are atomic. Existing destination slots are used; occupied or started destinations reject changes. The next match stays scheduled and requires a separate manual start.

## Maximum score and submission

Each athlete's score is capped at 50. Submission sets the submitting athlete's saved score to 50 and retains **SUBMISSION** as the win method. The first athlete to reach 50 through points wins by **POINTS**, including automatic opponent points from 3P. For example, 48 + 4 becomes 50. The clock stops and scoring/resume are blocked until the result is confirmed or the last award is undone. Winner and method are selected automatically; confirmation still requires **Xác nhận & lưu kết quả**.

New scoring actions record the score before and after, alongside the requested button and opponent benefit. Undo restores the exact previous score (48 in the example), rather than subtracting the requested 4 from 50. Legacy actions without this metadata retain their previous undo behavior.

## Keyboard and mouse controls

Points, advantages, penalties and submissions use the existing mouse buttons. There are no scoring shortcuts or attack activity controls on this screen.

Winner calculation checks submission/disqualification, then points, advantages, and fewer penalties. If these are equal, the referee chooses either athlete with **Quyết định trọng tài**. Attack activity is no longer accepted by the API or used to break ties. Existing attack records remain in history and do not affect winner calculation; saved results are not rewritten.

**Space** starts/pauses/resumes, **right-click / U / Ctrl/Cmd+Z** undo, **R** opens result confirmation when eligible, **F** toggles fullscreen, and **H** opens history in a separate tab. **Escape** closes confirmation; Tab and Enter retain their normal behavior inside the popup. Holding a key does not repeat commands. Shortcuts are ignored during text entry or while confirmation is open. Updates also require an editable match, ownership of its control lease, and no command in flight. Finished matches remain read-only, with fullscreen and history available.

## Match history

The **Lịch sử thao tác trọng tài** card appears immediately after **Kết quả từ bảng điểm**, before **Thông tin trận đấu**, at `/cms/matches/[id]/edit`. It uses the match data already fetched by that page and refreshes every three seconds. **Lịch sử trận** and **H** on the scoreboard open this page at its history section in a separate tab. The table shows newest actions first, athlete/corner, timestamp, remaining time, automatic opponent benefits, and undone status. Viewing history does not claim the scoreboard lease.

## Penalty indicators

Penalties automatically award the opponent the following benefits, identically for both sides:

| Penalty | Opponent benefit |
| --- | --- |
| 1P | No additional advantage or points |
| 2P | One additional advantage |
| 3P | Two additional points; the advantage from 2P remains |
| 4P | Win by disqualification; the opponent's score box displays 50 |

Existing points and advantages are preserved. The 50 is a display marker, so earned points remain available when undoing 4P. The clock stops at 4P and the winner/method are selected for the existing explicit result confirmation. Undo reverses the latest penalty and its automatic opponent award together; history records both effects. Reloading restores the saved counts and effects. Penalties recorded before this change are not retroactively awarded benefits, and undoing them does not remove benefits that were never awarded.

## Permissions and synchronization

`ADMIN` (Quản trị hệ thống) and `GAMES_ADMIN` (Quản lý sự kiện) can operate the board. Finishing a bout saves `REFEREE_CONFIRMED`. Both roles can approve, publish and lock results; only ADMIN can reopen results. Public scores remain hidden until publication.

The board polls every two seconds; schedule/bracket screens refresh every five seconds. Server version checks reject stale commands rather than overwrite another operator. Every command records the actor and a result revision. State is stored in `Match.resultData.scoreboard`; no database migration is required.

## Verification

```bash
npm run build
npm run lint --workspace=@sportdata/frontend
node --test apps/backend/scripts/scoreboard-penalties.test.cjs
node --test apps/frontend/tests/scoreboard-result.test.cjs
node --test apps/frontend/tests/scoreboard-controls.test.cjs
node apps/backend/scripts/smoke-scoreboard.mjs
```

The penalty tests use the real scoreboard service with in-memory transaction fixtures and require no database. They cover both sides, automatic awards, undo/replay, reload, invalid levels, stale commands, legacy actions, and disqualification confirmation.

The smoke test requires the development database and at least one country. It starts an isolated HTTP server, creates separate fixtures, checks authorization, clock persistence, scoring/undo, concurrent writes, scheduling/rest gates, winner/loser progression and transaction rollback, then deletes its fixtures. It does not alter existing competition matches.


For the layout/penalty regression check, install Playwright in a temporary directory, run the frontend locally, and point the test to the module and your browser executable:

```bash
npm install --prefix /tmp/sportdata-ui-check playwright
SCOREBOARD_PLAYWRIGHT_MODULE=/tmp/sportdata-ui-check/node_modules/playwright \
SCOREBOARD_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node apps/frontend/scripts/smoke-scoreboard-layout.mjs
```

If using Playwright's installed Chromium, omit `SCOREBOARD_CHROME_PATH`. The test mocks API data, compares reference geometry/colors at three viewport widths, and verifies all eight penalty buttons, sequential lighting, independent athletes, reload, undo, scoring, fullscreen, and confirmation. Screenshots are written to `/tmp/sportdata-reference-*.png` and `/tmp/sportdata-penalty-lights.png`.
