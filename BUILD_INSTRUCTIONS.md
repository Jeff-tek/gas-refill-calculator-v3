# Gas Refill Terminal — APK Build Instructions for Google Jules

This document provides step-by-step instructions for Google Jules (AI coding agent) to build the Gas Refill Terminal Android APK from the native Android project.

---

## Overview

The Gas Refill Terminal is a Next.js web app (already deployed via Vercel) with a **companion native Android app** built with:

- **Language:** Kotlin
- **UI Toolkit:** Jetpack Compose + Material 3
- **Minimum SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)
- **Build System:** Gradle with Kotlin DSL + Version Catalog

The Android project lives in the `android-app/` directory at the repo root.

---

## Project Structure

```
repo-root/
├── android-app/                    ← Android project root
│   ├── app/                        ← Android app module
│   │   ├── build.gradle.kts        ← App-level build config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/gasrefill/terminal/
│   │       │   ├── MainActivity.kt         ← Entry point + full UI
│   │       │   ├── models/
│   │       │   │   └── Transaction.kt      ← Data models
│   │       │   ├── ui/theme/
│   │       │   │   ├── Color.kt            ← Color palette
│   │       │   │   ├── Theme.kt            ← Material 3 theme
│   │       │   │   └── Type.kt             ← Typography
│   │       │   └── utils/
│   │       │       ├── Precision.kt        ← Number formatting
│   │       │       └── Storage.kt          ← SharedPreferences
│   │       └── res/
│   │           ├── drawable/               ← App icons go here
│   │           ├── font/                   ← Font files (.ttf/.otf)
│   │           └── values/
│   │               ├── colors.xml
│   │               └── themes.xml
│   ├── build.gradle.kts           ← Root build config
│   ├── settings.gradle.kts        ← Project settings
│   ├── gradle.properties          ← JVM & Android properties
│   └── gradle/
│       ├── libs.versions.toml     ← Version catalog (dependencies)
│       └── wrapper/
│           └── gradle-wrapper.properties
├── package.json
├── next.config.mjs
├── BUILD_INSTRUCTIONS.md          ← This file
└── README.md
```

---

## Prerequisites — What Jules Needs

### 1. Java Development Kit (JDK) 17+

Check if JDK 17+ is available:

```bash
java -version
```

If not installed:
- **Ubuntu/Debian:** `apt-get install openjdk-17-jdk`
- **macOS (Homebrew):** `brew install openjdk@17`
- **Manual:** Download from [adoptium.net](https://adoptium.net/)

Set `JAVA_HOME` if needed:

```bash
export JAVA_HOME=/path/to/jdk-17
```

### 2. Android SDK (Command-Line Tools)

**Option A — Install via sdkmanager (recommended):**

```bash
# Download command-line tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip -d ~/android-sdk
mkdir -p ~/android-sdk/cmdline-tools/latest
mv ~/android-sdk/cmdline-tools/* ~/android-sdk/cmdline-tools/latest/ 2>/dev/null || true

# Set environment variables
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Accept licenses & install SDK components
yes | sdkmanager --licenses
sdkmanager "platforms;android-34" "build-tools;34.0.0"
```

**Option B — Use Android Studio:**
If an Android Studio installation is available, set:

```bash
export ANDROID_HOME=~/Android/Sdk
```

### 3. Gradle Wrapper (Generate)

The project includes `gradle-wrapper.properties` but needs the `gradlew` script and `gradle-wrapper.jar`. Generate them:

```bash
cd android-app
gradle wrapper --gradle-version=8.7
```

If `gradle` is not available globally, download it:

```bash
wget https://services.gradle.org/distributions/gradle-8.7-bin.zip
unzip gradle-8.7-bin.zip
export PATH=$PATH:$(pwd)/gradle-8.7/bin
gradle wrapper --gradle-version=8.7
```

---

## Build Steps

### Step 1: Generate Gradle Wrapper

```bash
cd /path/to/repo/android-app
gradle wrapper --gradle-version=8.7
```

This creates:
- `gradlew` (shell script)
- `gradlew.bat` (Windows batch script)
- `gradle/wrapper/gradle-wrapper.jar`

Add these to the repo with `git add -A && git commit -m "Add Gradle wrapper"`.

### Step 2: Add App Icon (if missing)

The app needs a launcher icon. Generate a simple vector drawable:

```bash
mkdir -p app/src/main/res/mipmap-hdpi
mkdir -p app/src/main/res/mipmap-mdpi
mkdir -p app/src/main/res/mipmap-xhdpi
mkdir -p app/src/main/res/mipmap-xxhdpi
mkdir -p app/src/main/res/mipmap-xxxhdpi
```

Or create `app/src/main/res/drawable/ic_launcher_foreground.xml` as an adaptive icon.

### Step 3: Build Debug APK

```bash
cd android-app
chmod +x gradlew
./gradlew assembleDebug --stacktrace
```

The debug APK will be at:
```
app/build/outputs/apk/debug/app-debug.apk
```

### Step 4: Build Release APK (Signed)

#### 4a. Create a Keystore

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias gasrefill \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YourPassword \
  -keypass YourPassword \
  -dname "CN=Gas Refill, OU=Development, O=Gas Refill, L=Lagos, ST=Lagos, C=NG"
```

#### 4b. Create `keystore.properties`

Create `android-app/keystore.properties`:

```
storePassword=YourPassword
keyPassword=YourPassword
keyAlias=gasrefill
storeFile=../release.keystore
```

#### 4c. Add Signing Config to `app/build.gradle.kts`

Add this inside the `android { }` block:

```kotlin
signingConfigs {
    create("release") {
        val keystoreFile = rootProject.file("keystore.properties")
        if (keystoreFile.exists()) {
            val props = Properties().apply { load(keystoreFile.inputStream()) }
            storeFile = rootProject.file(props["storeFile"] as String)
            storePassword = props["storePassword"] as String
            keyAlias = props["keyAlias"] as String
            keyPassword = props["keyPassword"] as String
        }
    }
}

buildTypes {
    release {
        isMinifyEnabled = true
        proguardFiles(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro"
        )
        signingConfig = signingConfigs.getByName("release")
    }
}
```

#### 4d. Build Release APK

```bash
cd android-app
./gradlew assembleRelease --stacktrace
```

The release APK will be at:
```
app/build/outputs/apk/release/app-release.apk
```

### Step 5: Verify APK

```bash
# Verify signature
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk

# Check APK contents
unzip -l app/build/outputs/apk/release/app-release.apk | head -20
```

---

## Troubleshooting

### Build fails with "SDK location not found"
Set `ANDROID_HOME` environment variable or create `android-app/local.properties`:
```
sdk.dir=/path/to/Android/Sdk
```

### Build fails with "No cached version available"
Ensure the Gradle wrapper has internet access. Try:
```bash
./gradlew --refresh-dependencies assembleDebug
```

### Compose compiler version mismatch
If upgrading Kotlin, update `kotlinCompilerExtensionVersion` in `app/build.gradle.kts` to match the new Kotlin version. Compatible versions are listed at:
https://developer.android.com/jetpack/androidx/releases/compose-kotlin

### APK won't install on device
- Ensure "Install from unknown apps" is enabled
- The APK must be signed for installation on Android 14+
- Debug APKs work on devices with USB debugging enabled

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
Uninstall the existing version first:
```bash
adb uninstall com.gasrefill.terminal
```

---

## CI/CD Reference

The repo includes GitHub Actions workflows:

- **`.github/workflows/android-build.yml`** — Builds the debug APK on push to `main` (if `android-app/**` changed) or via `workflow_dispatch`. Runs on `ubuntu-latest` with JDK 17 and Gradle setup action.

- **`.github/workflows/pwa-validate.yml`** — Validates the web app (lint, types, build, tests) on every push/PR to `main`.

For the Android workflow to work, the repo needs the Gradle wrapper committed (`gradlew`, `gradlew.bat`, `gradle-wrapper.jar`). The workflow will automatically set up JDK 17 and cache Gradle dependencies.

---

## Key Config Files Reference

| File | Purpose |
|------|---------|
| `android-app/build.gradle.kts` | Root build: declares Android/Kotlin plugins |
| `android-app/app/build.gradle.kts` | App build: Compose, Material 3, serialization |
| `android-app/settings.gradle.kts` | Project settings, module includes |
| `android-app/gradle.properties` | JVM args, AndroidX, Kotlin style |
| `android-app/gradle/libs.versions.toml` | Version catalog: all dependency versions |
| `android-app/gradle/wrapper/gradle-wrapper.properties` | Gradle distribution URL (8.7) |
| `android-app/app/src/main/AndroidManifest.xml` | App manifest, permissions, activity |

---

## Quick Start (for Jules)

```bash
# 1. Set up environment
export ANDROID_HOME=~/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# 2. Generate Gradle wrapper
cd android-app
gradle wrapper --gradle-version=8.7

# 3. Build debug APK
chmod +x gradlew
./gradlew assembleDebug --stacktrace

# 4. Build release APK (if keystore available)
./gradlew assembleRelease --stacktrace
```

The debug APK will be at: `android-app/app/build/outputs/apk/debug/app-debug.apk`

---

## Web App (Vercel Deployment)

The parent project is a Next.js app that deploys to Vercel:

```bash
npm install
npm run build     # Static export to out/
npm run dev       # Dev server on localhost:3000
```

Vercel auto-detects Next.js when importing from GitHub. No special configuration needed. The web app and Android app share the same codebase — features are designed identically.

---

*Instructions prepared 2026-07-23 for the Gas Refill Terminal project.*
*Google Jules: Follow the Quick Start section above for fastest results.*
