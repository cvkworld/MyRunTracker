# MyRun

A React Native / Expo running tracker for iPhone, with separate running and cooldown walking statistics. No workout account, subscription, analytics, or server. The source is MIT licensed. This is a new implementation; it does not copy code from the linked reference projects.

**Expo Go supports foreground testing only. To record with your screen locked, install a native build.** You can avoid Apple's annual membership for personal use with the free signing route below; it requires a refresh every seven days.

## Choose your installation route

| Route | Apple membership | Screen-locked recording | Computer needed during a run |
| --- | --- | --- | --- |
| Expo Go | None | No; this app pauses when Go leaves the foreground | Development server for testing |
| Unsigned cloud build + AltStore Classic | Free Apple account, renew signing every 7 days | Implemented; validate on your device | No |
| EAS development build | Paid membership | Implemented; validate on your device | Metro for development |
| EAS preview / standalone build | Paid membership | Implemented; validate on your device | No |

Start with [Expo Go testing](docs/EXPO-GO.md), then use [free iPhone installation from Windows](docs/FREE-IOS-INSTALL.md). The [standard EAS installation guide](docs/EAS-IOS-INSTALL.md) is included if you prefer Apple's paid distribution route. Complete the [screen-lock acceptance test](docs/BACKGROUND-GPS.md) before relying on the recorder for workouts.

## Quick start on this Windows computer

Use Node.js 24 LTS. The project currently targets Expo SDK 57 and React Native 0.86.3; dependency versions are locked in package-lock.json. Update your iPhone 13 and Expo Go to supported versions.

```powershell
cd C:\Users\cvk\Documents\MyRunTracker
npm.cmd ci
npm.cmd start
```

Open the QR code using the iPhone Camera and choose Expo Go. Both devices should be on the same network. If Windows blocks the connection, allow Node on your private network; see the Expo Go guide for tunneling. On Ubuntu use `npm` instead of `npm.cmd`; work in the Linux filesystem rather than sharing Windows node_modules.

## Features

- Precise GPS with an iOS background location task, foreground permission checks, and an Always permission requirement for installed builds.
- Running distance, running time, rolling live pace, live speed, average pace and speed, and kilometre splits.
- Manual pause / resume. Paused time and movement are excluded, and the map does not join across pauses.
- A one-way transition from running to cooldown walking, with independent distance, time, calories, and splits. Finish saves both phases as one workout.
- Apple Maps route display through react-native-maps, with green running and blue walking lines. No Google Maps key is needed for this iOS app.
- SQLite history and in-progress recovery. Every delivered GPS batch is committed locally by the background task, without depending on a React screen.
- Configurable body weight, estimated calories, full workout JSON export, and filtered GPX route export through the iOS share sheet.
- Conservative GPS filtering, explicit route gaps, and recorder diagnostics.

The home screen begins at zero. No example distances are presented as actual measurements.

## Running it

1. Go outdoors and tap **Start run**. Accept the location prompt; turn on Precise Location. Installed builds also require Always access.
2. Wait for an accurate GPS fix. GPS acquisition has a 25-second timeout; retry outdoors if necessary.
3. The native build can now record with the screen locked. Expo Go must remain visible and pauses when it leaves the foreground.
4. Use **Pause** / **Resume** for breaks. There is no automatic pause; stationary time during an active phase is part of its pace.
5. Use **Start cooldown walk** when the run is complete. Running totals freeze; walking totals start separately.
6. Tap **Finish**, then **Save workout**. Open History to inspect the route and statistics or export a copy.

Settings default to 70 kg. Weight changes apply to the next workout. Energy is a rough estimate: running `1.0 × weightKg × kilometres`; walking `0.5 × weightKg × kilometres`. It is not based on a heart-rate sensor.

## How recording works

`index.ts` imports the task definition before registering the React root. `src/tracking/backgroundTask.ts` receives native location batches and writes to SQLite, even when a screen is not mounted. `engine.ts` requests high accuracy, fitness activity type, no automatic location pausing, and the iOS background indicator. Native background location uses Core Location; JavaScript intervals are only for refreshing the visible interface.

The location plugin configures `UIBackgroundModes: location` and permission descriptions. The Data Protection entitlement selects `NSFileProtectionCompleteUntilFirstUserAuthentication`, so files can remain available after the first unlock when the phone locks again. A new binary is required after native configuration changes. Expo Go uses its own app configuration and cannot validate these settings.

Sessions contain phase segments with start/end timestamps. Incoming points are assigned to the segment active at capture time, including delayed batches. Active durations come from those timestamps. A pause closes a segment; resuming creates a new one, preventing a distance jump. Finishing closes the session and saves its totals. A detected interrupted recorder is paused at its last stored point, preserving its history for resumption.

## Measurement choices

- Internally: metres, milliseconds, coordinates, and capture timestamps.
- Distance: Haversine calculations between accepted fixes. Accuracy worse than 35 m is filtered. Stationary jitter and implausible jumps above 12 m/s running or 4.5 m/s walking are filtered conservatively.
- Intervals over 30 seconds without a usable fix break the route. Their straight-line distance is not counted. Active time still runs until you pause, so missing GPS can reduce distance and worsen pace.
- Live speed uses a rolling 15-second distance window. It expires after 12 seconds without a usable fix. This is smoothed, not instantaneous or guaranteed once per second.
- Each full kilometre split uses an interpolated crossing timestamp. Running and walking have separate split sequences. A partial final kilometre is shown separately.
- Raw stored samples, including low-quality points, remain available in JSON. GPX exports filtered routes, with separate tracks for phases and segments for gaps/pauses.
- GPS accuracy varies with buildings, trees, phone placement, and conditions. These filters favor avoiding false distance and can undercount tight corners, slow movement, or missing intervals.

## Local data and maps

Workouts are stored in `myrun-v1.db` inside the app sandbox, with SQLite WAL transactions. There is no application backend or automatic workout upload. iOS backups may include app data. Export manually to Files for a portable copy; removing the app removes its local database. JSON export is a complete record, but this version does not include an import/restore interface.

GPS can record without mobile data. Apple Maps tiles are a platform service and may require a network connection; offline map downloads are not implemented. Map requests go to the map provider. The JavaScript/native bridge libraries are open source; iOS Core Location and MapKit are Apple platform frameworks.

## Source map

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Record, history, settings and workout detail screens |
| `src/tracking/engine.ts` | Permissions, foreground/native recording, recovery |
| `src/tracking/backgroundTask.ts` | Module-scope iOS task and durable GPS ingestion |
| `src/tracking/useTracker.ts` | UI actions and foreground refresh |
| `src/storage/repository.ts` | Serialized, transactional SQLite session model |
| `src/domain/metrics.ts` | Distance, timing, filtering, pace, calories and splits |
| `src/domain/export.ts` | JSON and GPX export |
| `src/ui/RouteMap.tsx` | Native Apple Maps route presentation |
| `app.json` | iOS permissions, location mode, data protection, icon and launch screen |
| `.github/workflows/ios-unsigned.yml` | Manual unsigned macOS cloud build |
| `eas.json` | Standard development, standalone preview and store build profiles |

## Development checks

```powershell
npm.cmd run check
npx.cmd expo install --check
npx.cmd expo-doctor
npx.cmd expo export --platform ios --output-dir build/ios-bundle
```

The tests exercise calculations and real SQLite transactions through a Node SQLite adapter. Node may print an experimental SQLite warning. It is a test-runtime warning, unrelated to iOS SQLite.

**Validation limit:** successful TypeScript checks, unit/database tests, config inspection and Metro export do not constitute a signed Xcode build or a physical iPhone GPS test. The supplied cloud workflow must run on macOS, and screen-locked recording must be verified on your iPhone using the included test. Force-quitting, rebooting, permission changes, storage exhaustion or OS termination can interrupt recording; saved points cannot reconstruct missing GPS positions.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for libraries, licenses and the three projects you found.
