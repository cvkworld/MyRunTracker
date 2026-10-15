# Verify GPS with the iPhone screen locked

Run this on an **installed native app**, preferably the standalone Release build. Expo Go cannot perform this test. This project has been checked on the development computer, but screen-locked GPS has not been verified on your physical iPhone.

## Before starting

- Open MyRun once after restarting/unlocking the iPhone.
- In iPhone Settings, set MyRun's Location to **Always** and enable **Precise Location**. Check Location Services is enabled.
- Start the workout with MyRun visible, outside with a clear view of the sky. Wait for usable GPS before locking.
- If using free signing, check the app has several days remaining. Do not refresh/reinstall the app during a workout.

The app uses Expo Location's continuous native location task, backed by Core Location. The required location background mode is in the native app configuration. The task is defined at module scope so it can save batches without a mounted screen. [Expo TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/)

## Test 1: lock for 10 minutes

1. Start an outdoor test workout and move for 1–2 minutes with the display on.
2. Note the wall-clock time when you press the side button to lock the screen. Do not swipe MyRun out of the app switcher.
3. Continue moving on a recognizable route for at least 10 minutes. Use corners or a loop so a missing track would be obvious. Do not unlock during this interval.
4. Note the unlock time. Open MyRun. The route should contain points from the locked portion, rather than a jump between its endpoints. Distance and phase time should have advanced. Poor reception can still create gaps, which the app intentionally does not bridge.
5. Finish, save, and export the full workout JSON to Files. Transfer that file to your computer.
6. Inspect the actual capture timestamps during the lock interval. For example:

   ```powershell
   node scripts/inspect-workout.mjs "C:\path\MyRun-export.json" "2026-10-15T18:00:00+02:00" "2026-10-15T18:10:00+02:00"
   ```

   Substitute your real file, lock time, unlock time, and timezone offset. `+02:00` is the Paris offset for this example date; choose the correct offset for your test date. The script prints timestamp counts, quality and the largest sample interval without printing coordinates.

7. Confirm numerous usable samples occur between locking and unlocking, with no unexplained long gaps. A timer advancing alone is insufficient evidence: time is derived from wall-clock timestamps, so the GPS point times and route are what matter.

## Test 2: running → pause → cooldown

1. Record a running phase. Pause for roughly a minute and move while paused.
2. Resume. Paused time and movement must not enter the run totals, and the map must not connect the two segments.
3. Start cooldown walking. Note the running totals.
4. Lock the phone again and walk for 5–10 minutes.
5. Unlock, finish and inspect History. Running totals must remain fixed, while walking has its own distance, time and splits. Export JSON if necessary to inspect phase assignment.

## Test 3: independent standalone use

For a Release standalone app, turn off Metro and your computer, start a new workout, and repeat a shorter locked-screen outing. Also try switching to another ordinary app. Tracking must not rely on the PC or the Record screen being visible. Map tiles may be unavailable without internet; this should not stop GPS point storage.

## Interruption test

After saving/exporting a test workout, try force-quitting during a separate disposable workout and reopening MyRun. **Continuous location cannot promise to survive force-quit or reboot.** Saved samples should remain; if a stopped recorder is detected, it is paused at its last stored sample and can be resumed. No missing positions are reconstructed. [Expo location limitations](https://docs.expo.dev/versions/latest/sdk/location/)

Do not assume swipe-away is equivalent to locking the phone. Apple controls process lifetime and GPS delivery. High accuracy and disabling automatic location pausing increase battery use; the app stops its location subscription on manual pause and finish. GPS intervals requested in code are not a hard delivery schedule.

## If the locked portion is missing

1. Confirm this is the installed app, not Expo Go, and check Always/Precise access again.
2. Check the saved GPS timestamps rather than just the on-screen timer.
3. Rebuild after changes to app.json/plugins. Restarting Metro cannot change an installed app's native background modes.
4. Inspect the build's Info.plist for `UIBackgroundModes` containing `location` and the location permission descriptions. The unsigned workflow checks those before packaging.
5. Read recorder diagnostics and filtered-point/gap counts. Poor accuracy, tunnels and storage problems can create gaps even while the native service is running.
6. If using sideloading, check signing validity and recheck permissions after installation changes. Export before deleting/reinstalling.

The app's default Data Protection setting permits files after first unlock, including a subsequently locked screen. That setting still needs to be validated together with the final signed build. Background Fetch, periodic task scheduling and keeping the display awake are not substitutes for continuous workout location.
