# Match scoreboard

Open **CMS → Sự kiện → Trận đấu**, then select the **▶ Bảng điểm** button. The screen at `/cms/matches/[id]/scoreboard` follows `scoreboard.html`: two rows occupying 80% of the screen, red/cyan totals, and a centered clock occupying 20%. Each row retains Submission, its counter, the horizontal 1P–4P penalty buttons, and the vertical 2/3/4 point buttons. Open **Điều khiển** for match controls, athlete names, history, and fullscreen.

## Operating a match

1. Schedule two distinct athletes, an FOP, and a start/end time. Both feeder matches must be finished. The start time must have arrived, the FOP and athletes must be free, and scheduling/rest constraints must pass. A disabled start button explains the blocker.
2. Open **Điều khiển**, then select **Bắt đầu trận**. Opening the screen alone does not start a match.
3. Use the vertical **2/3/4** buttons to record points. Use **1P → 2P → 3P → 4P** to record successive penalties: completed stages stay lit for each athlete independently, and only the next stage can be entered. Advantages remain in the control panel. **Hoàn tác** reverses the latest active award; the original stays in the history. Marking a submission does not automatically choose the winner or end the match.
4. Pause/resume as directed by the referee. The clock is saved on the server and survives reloads. Network loss disables controls; elapsed time continues from the saved timestamp. Zero time does not automatically finalize the result.
5. Pause, select **Xác nhận kết quả**, explicitly choose the winner and method, then confirm. Result saving and winner/loser destination updates are atomic. Existing destination slots are used; occupied or started destinations reject changes. The next match stays scheduled and requires a separate manual start.

## Penalty indicators

The four lights record referee-awarded penalties; penalty buttons do not themselves award points. Consequential advantages/points and disqualification are recorded on the referee's instruction with the existing controls and explicit outcome confirmation. Undo removes the latest penalty light and makes that stage available again; reloading restores lights from saved counts.

[JJIF Jiu-Jitsu Rules V2.8.1](https://www.ju-jitsu.sport/fileadmin/jjif/media/downloads/Rules/JiuJitsu/JJIF_Jiu-Jitsu_Rules_V_2.8.1_-_English.pdf), page 50, specifies the adult/U18 sequence and a different U16-and-younger sequence. This screen follows the supplied four-indicator layout; it does not implement a complete automatic rules engine.

## Permissions and synchronization

`ADMIN` (Quản trị hệ thống) and `GAMES_ADMIN` (Quản lý sự kiện) can operate the board. Finishing a bout saves `REFEREE_CONFIRMED`. Both roles can approve, publish and lock results; only ADMIN can reopen results. Public scores remain hidden until publication.

The board polls every two seconds; schedule/bracket screens refresh every five seconds. Server version checks reject stale commands rather than overwrite another operator. Every command records the actor and a result revision. State is stored in `Match.resultData.scoreboard`; no database migration is required.

## Verification

```bash
npm run build
npm run lint --workspace=@sportdata/frontend
node apps/backend/scripts/smoke-scoreboard.mjs
```

The smoke test requires the development database and at least one country. It starts an isolated HTTP server, creates separate fixtures, checks authorization, clock persistence, scoring/undo, concurrent writes, scheduling/rest gates, winner/loser progression and transaction rollback, then deletes its fixtures. It does not alter existing competition matches.


For the layout/penalty regression check, install Playwright in a temporary directory, run the frontend locally, and point the test to the module and your browser executable:

```bash
npm install --prefix /tmp/sportdata-ui-check playwright
SCOREBOARD_PLAYWRIGHT_MODULE=/tmp/sportdata-ui-check/node_modules/playwright \
SCOREBOARD_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node apps/frontend/scripts/smoke-scoreboard-layout.mjs
```

If using Playwright's installed Chromium, omit `SCOREBOARD_CHROME_PATH`. The test mocks API data, compares reference geometry/colors at three viewport widths, and verifies all eight penalty buttons, sequential lighting, independent athletes, reload, undo, scoring, fullscreen, and confirmation. Screenshots are written to `/tmp/sportdata-reference-*.png` and `/tmp/sportdata-penalty-lights.png`.
