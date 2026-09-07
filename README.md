# AttendMe - Mobile Attendance & Schedule Management System

AttendMe is a cross-platform mobile application designed for students to track academic attendance, calculate class allowances, manage daily timetables, and synchronize attendance data from educational portals such as Linways AMS.

Built using React Native, Expo SDK 57, and Expo Router, AttendMe provides an intuitive mobile interface, offline-first data persistence, native Android home screen widgets, background synchronization, notifications, and detailed attendance analytics.

---

## Download

The latest Android version is available through the GitHub Releases page.

**Current Release:** v2.0.0

Download the `AttendMe-v2.0.0.apk` file from the **Assets** section of the v2.0.0 release and install it directly on your Android device.

[View Releases](../../releases)

---

## Technical Stack & Architecture

- **Framework:** React Native 0.86 with Expo SDK 57
- **Routing & Navigation:** Expo Router v4 (File-based Routing)
- **Programming Language:** TypeScript / JavaScript (ESNext)
- **State Management:** React Context API
- **Local Storage:** `@react-native-async-storage/async-storage`
- **Secure Storage:** `expo-secure-store`
- **Native Extensions:** `react-native-android-widget`
- **Typography:** Google Manrope (`@expo-google-fonts/manrope`)
- **Icons:** Vector Icons
- **Animations:** React Native Reanimated v4
- **Graphics:** `react-native-svg`, Linear Gradients
- **Build & Deployment:** Expo Application Services (EAS Build)

---

## Core Features

### 1. Automated Linways AMS Synchronization

- Synchronizes subject rosters, timetable slots, and attendance records from supported Linways AMS portals.
- Supports both background and on-demand synchronization.
- Keeps locally stored attendance information updated with the latest available data.

### 2. Attendance Analytics & Margin Calculator

- Provides subject-by-subject attendance percentages.
- Calculates the number of future classes a student can safely miss while maintaining the required attendance threshold.
- Supports configurable attendance targets such as 75%.
- Provides a recovery calculator showing the number of consecutive classes that need to be attended to recover from low attendance.

### 3. Timetable & Class Schedule Tracker

- Interactive daily timetable displaying current, upcoming, and completed classes.
- Allows users to update class attendance with a single tap.
- Supports attendance states such as:
  - Attended
  - Missed
  - Class Cancelled

### 4. Calendar & Attendance History

- Monthly attendance overview with visual day indicators.
- Provides a historical record of attendance activity.
- Allows users to review previous attendance records for individual subjects and classes.

### 5. Native Android Home Screen Widget

- Provides a dedicated Android home screen widget.
- Displays overall attendance information and upcoming class details.
- Provides quick access to important attendance information without opening the application.

### 6. Notifications & Reminders

- Supports local notifications for upcoming classes.
- Provides schedule-related reminders directly on the device.
- Works alongside background synchronization to keep users informed.

### 7. Offline-First Architecture

- Stores application data locally for quick access.
- Allows core attendance and timetable information to remain available without an active internet connection.
- Synchronizes data when connectivity is available.

### 8. Security

- Sensitive credentials and tokens are stored using `expo-secure-store`.
- Persistent application data is stored locally using AsyncStorage.
- Separates sensitive authentication information from general application data.

---

## Project Directory Structure

    Attendace manager/

    ├── mobile/                       # Primary Mobile Application Root
    │   ├── app/                      # Expo Router Pages & Navigation
    │   │   ├── (tabs)/               # Main Tab Screens
    │   │   ├── settings-modals/      # Sub-screens & Modal Dialogs
    │   │   ├── _layout.tsx           # Root Application Layout
    │   │   └── +html.tsx             # Custom Web HTML Entry Header
    │   ├── assets/                   # Fonts, Images, Icons & Splash Assets
    │   ├── components/               # Reusable UI Components
    │   ├── constants/                # Colors, Typography & Theme Tokens
    │   ├── context/                  # React Context Providers
    │   ├── services/                 # Application Business Logic
    │   │   ├── linwaysSync.ts        # Linways Synchronization
    │   │   ├── notifications.ts      # Notification Scheduler
    │   │   └── storage.ts            # Storage Wrappers
    │   ├── widgets/                  # Native Android Widget Code
    │   ├── app.json                  # Expo Project Configuration
    │   ├── eas.json                  # EAS Build Configuration
    │   └── package.json              # Dependencies & NPM Scripts
    ├── .gitignore                    # Git Version Control Exclusions
    └── README.md                     # Project Documentation

---

## Development Setup & Prerequisites

### Prerequisites

Ensure the following tools are installed:

- **Node.js:** v18.x or higher
- **npm:** v9.x or higher
- **Yarn / pnpm:** Optional alternatives to npm
- **Expo Go:** For supported device testing
- **Android Emulator:** Optional, for Android development
- **iOS Simulator:** Optional, for iOS development on macOS

---

## Running the Application Locally

### 1. Navigate to the Mobile Application

    cd mobile

### 2. Install Dependencies

    npm install

### 3. Start the Expo Development Server

    npx expo start

### 4. Connect a Device or Emulator

**Expo Go:**

Scan the QR code displayed in the terminal using the Expo Go application.

**Android Emulator:**

Press `a` in the terminal to launch the application on a running Android emulator.

**Web Preview:**

Press `w` in the terminal to open the application in a web browser.

### 5. Clear Metro Cache

If you encounter caching or bundling issues, run:

    npx expo start --clear

---

## Building Native Android Binaries

AttendMe uses Expo Application Services (EAS Build) to generate Android application binaries.

### Install EAS CLI

    npm install -g eas-cli

### Login to Expo

    eas login

### Generate a Preview APK

    cd mobile
    npx eas build -p android --profile preview

After the build completes, EAS will provide a link to the generated APK.

---

## Installing the Release APK

If you only want to use AttendMe, you do not need to install the development environment or EAS CLI.

1. Open the [GitHub Releases](../../releases) page.
2. Select the version you want to install.
3. Download the `.apk` file from the **Assets** section.
4. Transfer or open the APK on your Android device.
5. If Android requests permission, allow installation from the source used to open the APK.
6. Install and launch AttendMe.

For the latest version, download:

**`AttendMe-v2.0.0.apk`**

---

## Release History

AttendMe maintains separate GitHub Releases for different versions of the application. Each release contains its corresponding release notes and downloadable APK when available.

- **v2.0.0** — Current mobile release with native Android features, widgets, background synchronization, notifications, offline-first storage, and redesigned mobile UI.
- **v1.5.0** — Previous mobile release.
- **v1.0.0** — Initial web-based release.

See the [GitHub Releases](../../releases) page for complete release notes and downloadable builds.

---

## License & Copyright

Copyright © 2026 AttendMe. All rights reserved.

This software and associated documentation files are proprietary. Unauthorized copying, distribution, modification, or reproduction of this software, in whole or in part, is strictly prohibited.