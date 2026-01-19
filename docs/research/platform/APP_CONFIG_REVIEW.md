# App Configuration Review: wtlfo

**Review Date:** January 19, 2026
**SDK Version:** Expo SDK 54 (React Native 0.81)

---

## Executive Summary

This document reviews the app configuration and metadata for the **wtlfo** Expo app - an LFO (Low Frequency Oscillator) visualization and parameter control tool, likely for music production/synthesis workflows. The app is well-configured for development but requires several additions before App Store submission.

### Priority Issues

| Priority | Issue | Impact |
|----------|-------|--------|
| HIGH | Android adaptive icon uses default Expo template images | Poor branding on Android |
| HIGH | No privacy policy URL configured | App Store rejection risk |
| HIGH | Missing app description | Marketing/discoverability |
| MEDIUM | App name "wtlfo" is cryptic | User experience |
| MEDIUM | No App Store category specified | Store optimization |
| LOW | ITSAppUsesNonExemptEncryption mismatch with Info.plist | Potential compliance issue |

---

## 1. App Identity

### App Name
- **Current:** `wtlfo`
- **Status:** NEEDS ATTENTION
- **Analysis:** The name "wtlfo" is cryptic and not user-friendly. While it may be intentional branding (possibly standing for "What The LFO" or similar), consider:
  - Adding a display name that's more descriptive (e.g., "WTLFO - LFO Visualizer")
  - The slug/scheme `wtlfo` is fine for technical purposes

### Bundle Identifier
- **iOS:** `com.brents.wtlfo`
- **Status:** CORRECT
- **Analysis:**
  - Format follows Apple's reverse-domain convention
  - Personal namespace (`brents`) is acceptable for individual developer
  - No conflicts expected

### Android Package Name
- **Status:** NOT EXPLICITLY SET
- **Analysis:** No `android.package` is defined in app.json. Expo will default to the iOS bundle identifier format, but you should explicitly set:
  ```json
  "android": {
    "package": "com.brents.wtlfo"
  }
  ```

### Versioning
- **Version:** `1.0.0`
- **Runtime Version Policy:** `appVersion`
- **Status:** CORRECT
- **Analysis:**
  - Semantic versioning is properly configured
  - EAS Build auto-increment is enabled for production builds
  - `appVersionSource: "remote"` in eas.json enables proper version management

---

## 2. App Store Metadata

### Privacy Policy URL
- **Current:** NOT CONFIGURED
- **Status:** REQUIRED FOR PRODUCTION
- **Impact:** App Store Connect will reject submissions without a privacy policy URL
- **Recommendation:** Add to app.json:
  ```json
  "ios": {
    "privacyManifests": {
      "NSPrivacyAccessedAPITypes": []
    }
  }
  ```
  And configure a `privacyPolicyUrl` or link to one in your App Store Connect listing.

### App Description
- **Current:** NOT CONFIGURED
- **Status:** RECOMMENDED
- **Recommendation:** Add a `description` field:
  ```json
  "description": "LFO visualizer and parameter modulation tool for music producers. Visualize waveforms, configure modulation destinations, and preview parameter changes in real-time."
  ```

### App Store Category
- **Current:** NOT CONFIGURED
- **Status:** RECOMMENDED
- **Suggested Categories:**
  - Primary: **Music** (most appropriate for LFO/synthesis tool)
  - Secondary: **Utilities** or **Productivity**

### Required Screenshots/Preview Content
For App Store submission, you will need:

| Platform | Size | Quantity |
|----------|------|----------|
| iPhone 6.7" (iPhone 15 Pro Max) | 1290 x 2796 | 1-10 |
| iPhone 6.5" (iPhone 11 Pro Max) | 1242 x 2688 | 1-10 |
| iPad Pro 12.9" (if supporting tablet) | 2048 x 2732 | 1-10 |

**Recommended Screenshot Content:**
1. Main LFO visualizer with waveform animation
2. Parameter grid showing controls
3. Destination meter with modulation preview
4. Different waveform types (sine, triangle, saw, etc.)
5. BPM sync/timing features

---

## 3. iOS Configuration

### Capabilities
- **Current:** Empty entitlements file (`wtlfo.entitlements`)
- **Status:** APPROPRIATE
- **Analysis:** The app doesn't appear to require special capabilities:
  - No push notifications needed
  - No background audio (app is a visualizer, not audio generator)
  - No HealthKit, HomeKit, etc.

### Background Mode
- **Current:** NOT CONFIGURED
- **Status:** CORRECT
- **Analysis:** This app visualizes LFO parameters but doesn't generate audio, so background modes are not needed. If future versions add audio output, consider:
  ```json
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["audio"]
    }
  }
  ```

### Entitlements
- **Status:** CORRECT (empty dict appropriate for this app)

### Info.plist Configuration
- **ITSAppUsesNonExemptEncryption:** `false` (correct - app doesn't use encryption)
- **NSAllowsArbitraryLoads:** `false` (secure)
- **NSAllowsLocalNetworking:** `true` (needed for development)
- **UIUserInterfaceStyle:** `Automatic` in Info.plist but `dark` in app.json
  - **Issue:** Minor mismatch - app.json sets `userInterfaceStyle: "dark"` but Info.plist has `Automatic`
  - **Recommendation:** Ensure consistency; if dark mode only is intended, both should match

### iPad Support
- **Current:** `supportsTablet: true`
- **Status:** CONFIGURED
- **Note:** iPad supports all orientations while iPhone is portrait-only (appropriate design choice)

---

## 4. Android Configuration

### Package Name
- **Current:** NOT EXPLICITLY SET
- **Status:** SHOULD BE ADDED
- **Recommendation:**
  ```json
  "android": {
    "package": "com.brents.wtlfo"
  }
  ```

### Permissions
- **Current:** No explicit permissions configured
- **Status:** CORRECT (minimal permissions)
- **Analysis:** The app doesn't appear to need any special permissions:
  - No camera
  - No microphone
  - No location
  - No storage access beyond app sandbox
  - No network permissions beyond local dev

### Adaptive Icon
- **Current Configuration:**
  ```json
  "adaptiveIcon": {
    "backgroundColor": "#000000",
    "foregroundImage": "./assets/images/android-icon-foreground.png",
    "monochromeImage": "./assets/images/android-icon-monochrome.png"
  }
  ```

- **Status:** CRITICAL ISSUE
- **Problem:** The adaptive icon images (`android-icon-foreground.png` and `android-icon-monochrome.png`) are using the **default Expo template blue arrow icon** instead of the app's orange LFO waveform design seen in `icon.png`.

- **Visual Mismatch:**
  | Asset | Content |
  |-------|---------|
  | `icon.png` | Orange sine wave with vertical bars on black (correct branding) |
  | `splash-icon.png` | Same orange LFO design (correct) |
  | `android-icon-foreground.png` | Blue arrow on white (WRONG - default template) |
  | `android-icon-monochrome.png` | Gray arrow (WRONG - default template) |

- **Recommendation:** Replace Android adaptive icon assets:
  1. Create `android-icon-foreground.png` with the orange LFO waveform on transparent background (1024x1024 recommended)
  2. Create `android-icon-monochrome.png` with a single-color version of the LFO waveform
  3. Keep `backgroundColor: "#000000"` as it matches the app theme

### Edge-to-Edge Display
- **Current:** `edgeToEdgeEnabled: true`
- **Status:** CORRECT
- **Note:** SDK 54 requires edge-to-edge on Android 16+; this is properly configured

### Predictive Back Gesture
- **Current:** `predictiveBackGestureEnabled: false`
- **Status:** CORRECT
- **Note:** Appropriately disabled as react-native-screens support is still maturing

---

## 5. Expo Configuration

### SDK Version
- **Current:** SDK 54 (`expo: ~54.0.31`)
- **Status:** CURRENT
- **Analysis:** SDK 54 is the latest stable release. The app is up-to-date.

### New Architecture
- **Current:** `newArchEnabled: true`
- **Status:** CORRECT
- **Note:** New Architecture is properly enabled. SDK 55 will require this.

### Plugins Configuration
- **Current Plugins:**
  1. `expo-router` - File-based routing
  2. `expo-splash-screen` - Splash screen configuration
  3. `expo-sqlite` - Local database

- **Status:** CORRECT
- **Analysis:** Plugins are appropriately minimal. No unnecessary plugins included.

### Splash Screen
- **Current Configuration:**
  ```json
  ["expo-splash-screen", {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#000000"
  }]
  ```
- **Status:** CORRECT
- **Note:** Splash icon correctly uses the LFO waveform branding

### Experiments
- **Current:**
  ```json
  "experiments": {
    "typedRoutes": true,
    "reactCompiler": true
  }
  ```
- **Status:** GOOD
- **Note:** Using React Compiler and typed routes are forward-looking choices

### EAS Build Configuration
- **File:** `eas.json`
- **Status:** PROPERLY CONFIGURED
- **Profiles:**
  | Profile | Distribution | Channel | Auto-Increment |
  |---------|--------------|---------|----------------|
  | development | internal | development | No |
  | preview | internal | preview | No |
  | production | (default) | production | Yes |

### EAS Project
- **Project ID:** `fd7017b3-0e29-4b90-8a09-cfdb437daca5`
- **Owner:** `brents`
- **Updates URL:** Configured for EAS Update

---

## 6. Missing Configuration for Production

### Required Before Submission

1. **Privacy Policy URL**
   ```json
   // In App Store Connect, or add to app.json if Expo adds support
   ```

2. **Android Package Name**
   ```json
   "android": {
     "package": "com.brents.wtlfo"
   }
   ```

3. **App Store Category** (configured in App Store Connect)

4. **Android Adaptive Icon Assets** - Replace with branded LFO waveform design

### Recommended Additions

1. **App Description**
   ```json
   "description": "LFO visualizer and modulation parameter tool for music production"
   ```

2. **GitHub URL** (if open source)
   ```json
   "githubUrl": "https://github.com/brents/wtlfo"
   ```

3. **Primary Color** (for store listings)
   ```json
   "primaryColor": "#ff6600"
   ```

4. **iOS 26 Liquid Glass Icon** (optional, for iOS 26+)
   ```json
   "ios": {
     "icon": "./assets/app.icon"  // Created with Icon Composer
   }
   ```

5. **Consider Adding Localization** support if targeting international users:
   ```json
   "locales": {
     "en": "./locales/en.json"
   }
   ```

---

## 7. Action Items Checklist

### Critical (Must Fix Before Release)
- [ ] Replace `android-icon-foreground.png` with LFO waveform design
- [ ] Replace `android-icon-monochrome.png` with single-color LFO waveform
- [ ] Add privacy policy URL (in App Store Connect)
- [ ] Add `android.package` to app.json

### High Priority
- [ ] Add app `description` to app.json
- [ ] Prepare App Store screenshots (minimum 3-5)
- [ ] Write App Store description and keywords
- [ ] Select appropriate App Store category

### Medium Priority
- [ ] Consider more descriptive display name
- [ ] Verify `userInterfaceStyle` consistency (app.json vs Info.plist)
- [ ] Prepare promotional graphics for Google Play

### Low Priority / Future
- [ ] Create iOS 26 Liquid Glass icon with Icon Composer
- [ ] Add localization for international markets
- [ ] Configure App Clips (if applicable)
- [ ] Set up App Store in-app events

---

## 8. Files Reviewed

| File | Path |
|------|------|
| app.json | `/Users/brent/wtlfo/app.json` |
| eas.json | `/Users/brent/wtlfo/eas.json` |
| package.json | `/Users/brent/wtlfo/package.json` |
| Info.plist | `/Users/brent/wtlfo/ios/wtlfo/Info.plist` |
| Entitlements | `/Users/brent/wtlfo/ios/wtlfo/wtlfo.entitlements` |
| Icon assets | `/Users/brent/wtlfo/assets/images/` |

---

## Appendix: Recommended app.json Additions

```json
{
  "expo": {
    "name": "WTLFO",
    "description": "LFO visualizer and modulation parameter tool for music production. Visualize waveforms, configure destinations, and preview modulation in real-time.",
    "android": {
      "package": "com.brents.wtlfo",
      "adaptiveIcon": {
        "backgroundColor": "#000000",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      }
    },
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": []
      }
    }
  }
}
```
