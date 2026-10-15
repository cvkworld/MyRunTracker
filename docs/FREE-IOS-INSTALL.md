# Install on your iPhone from Windows without the $99 membership

For personal use, a free Apple account can sign apps with short-lived provisioning. AltStore Classic provides Windows signing and installation. Apps must be refreshed before their seven-day signing period expires; Apple also limits free-account sideloaded apps. See [Apple's free-account restrictions](https://developer.apple.com/help/account/basics/about-your-developer-account) and [AltStore's refresh explanation](https://faq.altstore.io/altstore-classic/your-altstore).

The route here combines **an unsigned release build on a cloud Mac** with **free personal signing through AltStore Classic**. It is an alternative to the standard EAS signed-device build. No Apple ID, password, signing key, Expo token, or paid membership is used by the included GitHub workflow. Authenticate only in AltStore/AltServer's own interface when installing. Building the IPA does not sign it for your phone.

An initial native build completed successfully on October 15, 2026: [build and checks](https://github.com/cvkworld/MyRunTracker/actions/runs/38744381061). Its compiled source is commit `0376734dd5345b89d630ce51c06d27f0508c959f`. The downloaded IPA was checked for an ARM64 iPhone executable, bundled JavaScript, location background mode and permission descriptions. It requires iOS 16.4 or newer. Installation and screen-locked recording still need testing on a physical iPhone.

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

Do not try to install the unsigned IPA directly from Safari. It needs signing in the next step. If a future GitHub runner has an incompatible Xcode version, inspect its Xcode log and select an appropriate macOS image before rebuilding. No weekly rebuild is needed if the app source has not changed: refreshing the signing is separate from compiling.

## 2. Set up AltStore Classic

### Windows setup, including iOS 26

Follow [AltStore's current official Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows). Use **AltStore Classic**, which supports importing your own IPA.

1. Install AltServer for Windows and its documented Apple software dependencies. Consult its current guide for iTunes/iCloud requirements and Store-version alternatives.
2. Connect your unlocked iPhone by USB, trust the computer, and enable the documented Wi-Fi sync setting.
3. Start AltServer and use its tray menu to install AltStore onto your iPhone. Authenticate with your free Apple account in AltServer's own interface. Do not put credentials in this repository or GitHub Actions.
4. On iPhone, trust the developer profile under Settings → General → VPN & Device Management. Enable Developer Mode under Privacy & Security when required, including the restart/confirmation.
5. Confirm AltStore opens successfully before continuing.

The initial setup requires a USB data connection unless the phone has already been paired with this computer and is reachable through Wi-Fi sync. Codex being open on the iPhone does not provide that pairing or installation access. If you have no cable and no existing pairing, save the IPA and complete this step when a cable is available.

### Cable-free option: iOS 27 and AltStore PAL eligibility

AltStore's September 2026 announcement says that **iOS 27** supports setting up Remote AltServers entirely on the device; installing Classic through **AltStore PAL** can therefore avoid the computer and cable. This does not apply to iOS 26.6.2. See [AltStore's announcement](https://bsky.app/profile/altstore.io/post/3mviuyldlt22q) and the [Remote AltServers guide](https://faq.altstore.io/altstore-classic/remote-altservers).

1. Check your iOS version and PAL eligibility before choosing this route. AltStore currently lists the EU, Japan and Brazil, with an eligible App Store account and physical presence in a supported region. [Download requirements](https://altstore.io/download), [Apple's regional requirements](https://support.apple.com/en-us/117767).
2. On an eligible iPhone running iOS 27, open [AltStore's official download page](https://altstore.io/download) in Safari. Follow the marketplace installation prompts on the phone.
3. In PAL, find and install the public **AltStore Classic** app from AltStore's own source. PAL itself does not import arbitrary IPA files. Avoid selecting a paid beta when a public release is available.
4. Open Classic, go to Settings and choose **Set up Remote AltServer...**. Follow its iOS 27 on-device pairing instructions. Install LocalDevVPN when directed, and approve the device prompts yourself.
5. Connect to Wi-Fi and LocalDevVPN for signing/installing/refreshing. Authenticate with your own free Apple account in Classic's interface, then continue below. A remote server is needed for this setup; check AltStore's documentation for its operation and privacy details.

These are installation alternatives, not changes to MyRun's recording engine. If Classic requests a PC/USB connection or you are below iOS 27, use the Windows setup above. An OS update is optional; it is not required to run MyRun. The iPhone 13 is [compatible with iOS 27](https://support.apple.com/en-lamr/guide/iphone/iphe3fa5df43/27/ios/27).

## 3. Sign and install MyRun

1. Transfer **MyRun-unsigned.ipa** to the iPhone's Files app, for example through iCloud Drive or your preferred file transfer.
2. For Windows setup, keep AltServer running and reachable from the phone, on the same local network or through the supported USB connection. For a configured Remote AltServer, follow Classic's Wi-Fi/LocalDevVPN instructions instead.
3. In AltStore Classic, open **My Apps**, tap **+**, and select the IPA in Files. Follow the signing prompts. There are no app extensions to reserve extra slots for.
4. Launch MyRun from its Home Screen icon. This Release build contains its JavaScript bundle and requires neither Expo Go nor Metro nor a running computer during workouts.
5. In MyRun, start an outdoor test and grant location access. Set Location to **Always**, and turn **Precise Location** on in iPhone Settings → Apps → MyRun → Location (the path varies by iOS version). An initial Allow Once choice can require manually changing Settings.
6. Complete the [locked-screen GPS test](BACKGROUND-GPS.md). Signing and installation success alone does not prove recording reliability on your device.

## 4. Refresh before seven days

Use AltStore's **Refresh All** while the local or configured Remote AltServer is reachable. Automatic refresh is available, but check the remaining days before a run; do not rely on automatic refresh always succeeding. An AltServer-installed Classic uses one of the free sideloading slots. The free account allows three active sideloaded apps total, so this simple app fits alongside AltStore. [AltStore limitations](https://faq.altstore.io/altstore-classic/your-altstore)

Refreshing normally updates signing without requiring deletion. Export your workouts before installation changes. If the app expires, refresh/re-sign it; avoid deleting the app as a first troubleshooting step because its local database is removed with it.

If you later change the source, rebuild the IPA and install it using the same account and app identity. Changing signing identity or deleting the app may affect local data. Core Location permissions may need checking again after signing/install changes.

## Alternatives

With access to a Mac, Xcode Personal Team signing can also use a free Apple account with the same short provisioning period. For App Store/TestFlight distribution or the standard EAS signed-device workflow, paid Apple Developer Program membership is required; see [the EAS guide](EAS-IOS-INSTALL.md).

The free route trades convenience for weekly signing maintenance. It does not impose a foreground-only restriction on MyRun: native background recording is configured in the built app. OS termination, force-quitting, rebooting and GPS availability can still interrupt recording regardless of how it was signed.
