# Open-source components and references

MyRun source is MIT licensed. Installed packages retain their own licenses; see each package's LICENSE and the lockfile for resolved versions. There is no subscription SDK or commercial background-GPS library.

| Component | Role | Project |
| --- | --- | --- |
| React | UI | [facebook/react](https://github.com/facebook/react), MIT |
| React Native | Native application framework | [facebook/react-native](https://github.com/facebook/react-native), MIT |
| Expo and SDK modules | Location, task execution, SQLite, files, sharing, haptics, fonts and development tooling | [expo/expo](https://github.com/expo/expo), MIT |
| react-native-maps | Native MapKit bridge | [react-native-maps](https://github.com/react-native-maps/react-native-maps), MIT |
| react-native-safe-area-context | iPhone safe areas | [safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context), MIT |
| Ionicons via @expo/vector-icons | Icons | [Ionicons](https://github.com/ionic-team/ionicons), MIT; [Expo vector icons](https://github.com/expo/vector-icons), MIT |
| TypeScript, tsx, Node SQLite | Development and tests | [TypeScript](https://github.com/microsoft/TypeScript), Apache-2.0; [tsx](https://github.com/privatenumber/tsx), MIT; [Node](https://github.com/nodejs/node), see its notices |

The app mark is hand-drawn in assets/icon.svg, with PNGs reproducible using scripts/create-assets.ps1. No third-party photographs or map tile bundles are included. Native Apple frameworks and Apple Maps are platform services, not open-source map data shipped by this project.

## Projects supplied as references

- [FreePace](https://github.com/sawtoothdata/FreePace): a native iOS running application. Its documented setup uses Xcode. The repository lists an MIT license.
- [OutRun](https://github.com/timfraedrich/OutRun): a native iOS workout recorder with local-data and GPX features, published under GPLv3.
- [iOS Open GPX Tracker](https://github.com/merlos/iOS-Open-GPX-Tracker): a Swift GPX recorder for iOS/watchOS, published under GPLv3.

These repositories are useful native-iOS references, but are not Expo Go applications. This project implements its own React Native application and does not incorporate their code or assets. Consult their licenses before copying code into a derivative project.

AltStore Classic / AltServer and GitHub Actions are optional build/installation tools, not runtime app dependencies. Follow their own requirements and terms. They do not receive MyRun workout history through this app.
