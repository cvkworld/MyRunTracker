# Test on iPhone 13 using Expo Go

This is the free first test. It covers the interface, foreground GPS, calculations, cooldown, local history and export. Expo Go cannot test this app's background iOS configuration. [Expo's location documentation](https://docs.expo.dev/versions/latest/sdk/location/)

## Windows

1. Install Node.js 24 LTS if needed. Open a new PowerShell window and check `node --version`.
2. Install the latest Expo Go from the iPhone App Store.
3. Open the source folder:

   ```powershell
   cd C:\Users\cvk\Documents\MyRunTracker
   npm.cmd ci
   npm.cmd start
   ```

4. Connect the PC and iPhone to the same Wi-Fi network. Allow Node through Windows Firewall on the private network if prompted. Avoid a guest network that isolates devices.
5. Scan the terminal QR with the iPhone Camera. Tap the Expo Go link. Do not press the terminal `i` shortcut: an iOS simulator requires macOS.
6. If iOS requests Local Network access for Expo Go, allow it. It is needed to contact the development server, not for workout uploads.
7. If the QR cannot connect, stop Metro with Ctrl+C and try:

   ```powershell
   npx.cmd expo start --go --tunnel
   ```

   Expo may ask to install its tunnel dependency. A tunnel uses an external development relay and requires internet on both devices. Your workout database remains on the phone.

## Ubuntu

In the project folder, run `npm ci` followed by `npm start`. Use the same Wi-Fi and QR steps. If using WSL on Windows, Windows Node/PowerShell is usually simpler for LAN testing; WSL networking can make the local QR address unreachable. Tunneling is an alternative.

## Foreground workout test

1. In Settings, enter your body weight and save it.
2. Outdoors, tap Start run. Choose Allow While Using the App and enable Precise Location. The permission may appear under Expo Go rather than MyRun.
3. Keep Expo Go on screen. For this test, temporarily set iPhone Settings → Display & Brightness → Auto-Lock to Never if available. Restore your normal preference afterwards.
4. Move for a few minutes. Distance, active time, pace, speed and the route should update. GPS needs movement and several seconds of samples before a useful live pace appears.
5. Pause and move a little. Resume. Paused movement and time must be excluded, and the route must break at the pause.
6. Start cooldown walking. Running totals must stop changing; walking totals must update independently.
7. Finish and save. Open History, inspect the workout, and export JSON or GPX to Files.
8. Reopen the app and confirm the saved workout remains.

If you lock the phone or switch away, this app deliberately pauses the Expo Go workout. On returning, resume manually. Do not treat that result as a background-location failure: Go has no background recorder for this task. Follow [free standalone installation](FREE-IOS-INSTALL.md) to test locked-screen recording.

If the app reports an SDK mismatch, update Expo Go. A physical iPhone cannot install arbitrary historical Expo Go versions. If the App Store version has not yet caught up with this SDK, use a matching development/standalone build or deliberately migrate the project and dependencies together; do not individually downgrade React Native or a native library.

Reference: [Expo development workflow](https://docs.expo.dev/get-started/start-developing/).
