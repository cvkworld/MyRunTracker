#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Run this on a macOS GitHub Actions runner, or a Mac with Xcode. See docs/FREE-IOS-INSTALL.md."
  exit 1
fi

xcodebuild -version
xcodebuild \
  -workspace ios/MyRun.xcworkspace \
  -scheme MyRun \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  build

app='build/DerivedData/Build/Products/Release-iphoneos/MyRun.app'
test -d "$app"
test -f "$app/main.jsbundle"
/usr/libexec/PlistBuddy -c 'Print :UIBackgroundModes' "$app/Info.plist" | grep -q location
/usr/libexec/PlistBuddy -c 'Print :NSLocationAlwaysAndWhenInUseUsageDescription' "$app/Info.plist"
mkdir -p build/Payload
ditto "$app" build/Payload/MyRun.app
ditto -c -k --sequesterRsrc --keepParent build/Payload build/MyRun-unsigned.ipa
echo 'Created build/MyRun-unsigned.ipa. Sign and install with AltStore Classic; it cannot install directly.'
