# Standard EAS installation from Windows or Ubuntu

EAS Build compiles iOS in the cloud. You can use its CLI from Windows or Linux; no local Mac is required. Standard signed physical-device builds require a paid Apple Developer Program account. Apple currently lists US$99 per membership year, with regional pricing and certain organizational fee waivers. [EAS setup](https://docs.expo.dev/build/setup/), [Apple enrollment](https://developer.apple.com/programs/enroll/)

Expo offers a limited free cloud-build plan; check the current quota before building. A paid Expo plan is separate from Apple membership and is not inherently required for this app. [Expo pricing](https://expo.dev/pricing)

## Prepare

1. Install Node 24 LTS and run `npm ci` in the project folder. On PowerShell use `npm.cmd` and `npx.cmd` if execution policy blocks the .ps1 shims. The commands below use `npx`; on Windows you may substitute `npx.cmd` throughout.
2. In app.json, change `ios.bundleIdentifier` to your own stable identifier, such as `com.yourname.myrun`. Keep the app name MyRun if using the supplied unsigned build script; the standard EAS build can handle a different app name.
3. Create a free Expo account, enroll with Apple, and complete Apple's agreements and two-factor authentication. Do not paste account passwords or signing credentials into source files.
4. In the project folder:

   ```text
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   Let EAS create/link the project and add its project ID to your app configuration. The existing eas.json already supplies the three build profiles.

## Development build

1. Register your iPhone:

   ```text
   npx eas-cli@latest device:create
   ```

2. Choose the website registration method and open the resulting URL on the iPhone. Follow the profile/device-registration steps.
3. Build:

   ```text
   npx eas-cli@latest build --platform ios --profile development
   ```

4. Allow EAS to manage the signing certificate/profile if desired. Select your registered iPhone when prompted. A simulator build is not suitable for physical-device GPS testing.
5. Open the build installation link/QR on the iPhone and install the app. Enable Developer Mode if requested. Check your native location permissions.
6. Start the development server:

   ```text
   npm run start:dev
   ```

7. Open MyRun's development client and scan/open its QR. Test the interface, GPS and background behavior. Keep the development server reachable while developing.

Official physical-device instructions: [Create an iOS development build](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

## Standalone personal app without Metro

Build the preview profile:

```text
npx eas-cli@latest build --platform ios --profile preview
```

Install using its device link. This is an ad hoc signed Release build with bundled JavaScript; it runs from the Home Screen without a computer, Metro or Expo Go. Only devices in its provisioning profile can install it. It uses the same bundle identifier as development, so installing one build can replace the other. Export data before changing installation/signing arrangements.

Provisioning/certificates expire; ad hoc installation is not permanent unlimited distribution. Rebuild/re-sign before expiry. See [internal distribution](https://docs.expo.dev/build/internal-distribution/).

Now perform [the screen-lock test](BACKGROUND-GPS.md), including a run with the PC/server turned off.

## Optional TestFlight / App Store

1. Create the matching app record in App Store Connect. Complete the required metadata and privacy information for your intended release.
2. Build and submit:

   ```text
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios --profile production --latest
   ```

3. Select the correct production build and follow the App Store Connect/TestFlight steps. External testing and store distribution may require Apple review. Describe the workout-triggered background location use accurately.

The production profile increments the build number. Submission is separate from approval/public release. [Expo TestFlight guide](https://docs.expo.dev/submit/testflight/)

Local iOS compilation through `expo run:ios` or `eas build --local --platform ios` needs macOS/Xcode. Ubuntu can run Metro and request cloud builds but does not replace Xcode for native compilation.
