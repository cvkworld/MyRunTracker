# Install on your iPhone from Windows without the $99 membership

For personal use, a free Apple account can sign apps with short-lived provisioning. AltStore Classic provides Windows signing and installation. Apps must be refreshed before their seven-day signing period expires; Apple also limits free-account sideloaded apps. See [Apple's free-account restrictions](https://developer.apple.com/help/account/basics/about-your-developer-account) and [AltStore's refresh explanation](https://faq.altstore.io/altstore-classic/your-altstore).

The route here combines **an unsigned release build on a cloud Mac** with **free signing on your Windows computer**. It is an alternative to the standard EAS signed-device build. No Apple ID, password, signing key, Expo token, or paid membership is used by the included GitHub workflow. You authenticate locally with AltServer when installing. I have not run this workflow on your GitHub account or signed it for your phone.

Background modes and Data Protection are available to free Apple developer accounts. Recording a route does not require a paid Maps directions capability. [Apple capability table](https://developer.apple.com/help/account/reference/supported-capabilities-ios/)

## 1. Get the unsigned iPhone build

The included `.github/workflows/ios-unsigned.yml` runs only when you manually request it. It uses a standard macOS runner, installs packages and CocoaPods, generates the iOS project, runs the checks, and builds a Release app with signing disabled. It checks for the bundled JavaScript and the location background mode before packaging a real-device IPA.

1. Create a GitHub account and a new repository. Public repositories have free standard hosted-runner execution; private repositories use your account's quota. Artifact storage and paid/larger runners have their own rules. Keep within the free limits and check your billing settings. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
2. Upload this project's source, including `.github`, `scripts`, `assets`, package.json and package-lock.json, directly to the repository root. Do not upload node_modules, build outputs, signing credentials, or exported workout files. The `.gitignore` already excludes generated directories.
3. If you use Git in PowerShell, from the source folder:

   ```powershell
   git init
   git add .
   git commit -m "Add MyRun iPhone app"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   Replace the repository URL with your actual URL. Authenticate using GitHub's normal sign-in flow. Alternatively upload via the GitHub website, preserving the folder structure. `.github/workflows/ios-unsigned.yml` must be at the repository root, rather than inside an extra MyRunTracker folder.
4. Open the repository's **Actions** tab. Enable Actions if GitHub asks. Choose **Build unsigned iPhone app**, then **Run workflow** on your main branch.
5. Wait for the build to finish. A cloud Mac still performs the native compilation; your Windows/Ubuntu machine does not run Xcode.
6. Open the completed run and download the **MyRun-unsigned-iPhone** artifact. Extract its ZIP to obtain **MyRun-unsigned.ipa**. The artifact is retained for three days; save the IPA locally.

Do not try to install the unsigned IPA directly from Safari. It needs signing in the next step. The included workflow is source, not a prebuilt or device-tested binary. If a future GitHub runner has an incompatible Xcode version, inspect its Xcode log and select an appropriate macOS image before rebuilding. No weekly rebuild is needed if the app source has not changed: refreshing the signing is separate from compiling.

## 2. Install AltStore Classic from Windows

Follow [AltStore's current official Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows). Use **AltStore Classic**, which supports importing your own IPA.

1. Install AltServer for Windows and its documented Apple software dependencies. Consult its current guide for iTunes/iCloud requirements and Store-version alternatives.
2. Connect your unlocked iPhone by USB, trust the computer, and enable the documented Wi-Fi sync setting.
3. Start AltServer and use its tray menu to install AltStore onto your iPhone. Authenticate with your free Apple account in AltServer's own interface. Do not put credentials in this repository or GitHub Actions.
4. On iPhone, trust the developer profile under Settings → General → VPN & Device Management. Enable Developer Mode under Privacy & Security when required, including the restart/confirmation.
5. Confirm AltStore opens successfully before continuing.

## 3. Sign and install MyRun

1. Transfer **MyRun-unsigned.ipa** to the iPhone's Files app, for example through iCloud Drive or your preferred file transfer.
2. Keep AltServer running and reachable from the phone, on the same local network or through the supported USB connection.
3. In AltStore Classic, open **My Apps**, tap **+**, and select the IPA in Files. Follow the signing prompts. There are no app extensions to reserve extra slots for.
4. Launch MyRun from its Home Screen icon. This Release build contains its JavaScript bundle and requires neither Expo Go nor Metro nor a running computer during workouts.
5. In MyRun, start an outdoor test and grant location access. Set Location to **Always**, and turn **Precise Location** on in iPhone Settings → Apps → MyRun → Location (the path varies by iOS version). An initial Allow Once choice can require manually changing Settings.
6. Complete the [locked-screen GPS test](BACKGROUND-GPS.md). Signing and installation success alone does not prove recording reliability on your device.

## 4. Refresh before seven days

Use AltStore's **Refresh All** while AltServer is reachable. Automatic refresh is available, but check the remaining days before a run; do not rely on automatic refresh always succeeding. AltStore itself uses one of the free sideloading slots. The free account allows three active sideloaded apps total, so this simple app fits alongside AltStore. [AltStore limitations](https://faq.altstore.io/altstore-classic/your-altstore)

Refreshing normally updates signing without requiring deletion. Export your workouts before installation changes. If the app expires, refresh/re-sign it; avoid deleting the app as a first troubleshooting step because its local database is removed with it.

If you later change the source, rebuild the IPA and install it using the same account and app identity. Changing signing identity or deleting the app may affect local data. Core Location permissions may need checking again after signing/install changes.

## Alternatives

With access to a Mac, Xcode Personal Team signing can also use a free Apple account with the same short provisioning period. For App Store/TestFlight distribution or the standard EAS signed-device workflow, paid Apple Developer Program membership is required; see [the EAS guide](EAS-IOS-INSTALL.md).

The free route trades convenience for weekly signing maintenance. It does not impose a foreground-only restriction on MyRun: native background recording is configured in the built app. OS termination, force-quitting, rebooting and GPS availability can still interrupt recording regardless of how it was signed.
