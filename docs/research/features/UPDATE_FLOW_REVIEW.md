# OTA Update Flow Review

**Project:** wtlfo
**Date:** 2026-01-19
**Reviewer:** Claude Code Analysis

---

## Executive Summary

The OTA update implementation in this Expo app is **functional but minimal**. The core flow works correctly with good user feedback during the update process, but several opportunities exist to improve reliability, user experience, and edge case handling.

**Overall Rating:** 7/10 - Solid foundation, room for improvement

---

## 1. Update UI Analysis

**File:** `/Users/brent/wtlfo/app/(settings)/index.tsx`

### Strengths

| Aspect | Implementation | Rating |
|--------|---------------|--------|
| **Progress Communication** | Shows "Checking..." and "Downloading..." states with ActivityIndicator | Good |
| **Version Display** | Shows app version (v1.0.0) and truncated update ID | Good |
| **Update Available Indicator** | Green text "Update available - tap to download" | Good |
| **Restart Prompt** | Alert dialog with "Later" and "Restart" options | Good |

### Code Review

```typescript
// Good: Uses the useUpdates hook for reactive state
const {
  currentlyRunning,
  isUpdateAvailable,
  isUpdatePending,
  isChecking,
  isDownloading,
} = useUpdates();
```

```typescript
// Good: Checks if updates are enabled before attempting operations
if (!Updates.isEnabled) {
  Alert.alert('Updates Disabled', 'OTA updates are not enabled in this build.');
  return;
}
```

### Issues Found

1. **Hardcoded Version Number**
   ```typescript
   const APP_VERSION = '1.0.0';  // Line 8
   ```
   - **Problem:** Version is hardcoded, not synced with app.json
   - **Risk:** Version display could become stale
   - **Recommendation:** Import from `expo-constants` or app.json

2. **No Download Progress Indicator**
   - Current implementation shows "Downloading..." but no percentage
   - Users on slow connections have no idea how long to wait

3. **Basic Error Display**
   ```typescript
   Alert.alert('Error', `Failed to download update: ${e}`);
   ```
   - Raw error objects shown to users
   - No retry mechanism offered

4. **Optional Update Flow**
   - Update prompt can be dismissed with "Later"
   - No mechanism to remind users later
   - Dismissed updates may never be applied

---

## 2. Update Configuration Analysis

### app.json Configuration

```json
{
  "runtimeVersion": {
    "policy": "appVersion"
  },
  "updates": {
    "url": "https://u.expo.dev/fd7017b3-0e29-4b90-8a09-cfdb437daca5"
  }
}
```

### Missing Configuration Options

| Option | Current | Recommended | Notes |
|--------|---------|-------------|-------|
| `checkAutomatically` | Default (ON_LOAD) | Explicit setting | Consider WIFI_ONLY for data-conscious users |
| `fallbackToCacheTimeout` | Default (0) | Consider 3000-5000ms | Would allow critical updates on launch |
| `enabled` | Default (true) | Explicit setting | Document the expected behavior |

### EAS Channels Configuration

**File:** `/Users/brent/wtlfo/eas.json`

```json
{
  "build": {
    "development": { "channel": "development" },
    "preview": { "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

- **Status:** Properly configured with three channels
- **Recommendation:** Consider adding a `staging` channel for QA testing

### Runtime Version Policy

- Uses `"policy": "appVersion"` which ties updates to app version
- **Good:** Simple and predictable
- **Consider:** `fingerprint` policy for automatic native code change detection

---

## 3. User Experience Analysis

### Update Checking

| Aspect | Current Behavior | Assessment |
|--------|------------------|------------|
| **Automatic Check** | On app load (default) | Good for freshness |
| **Manual Check** | Tap version/update ID | Discoverable but not obvious |
| **WiFi-Only Option** | Not implemented | Missing for data-conscious users |

### Update Application

| Aspect | Current Behavior | Assessment |
|--------|------------------|------------|
| **Mandatory Updates** | No | All updates are optional |
| **Restart Handling** | Alert with choice | Good - user maintains control |
| **Deferred Updates** | Dismissed permanently | Poor - no reminder system |

### Recommendations for UX

1. **Add explicit "Check for Updates" button** - Current tap target is small text
2. **Implement "Ask me later" with reminder** - Re-prompt after X app launches
3. **Consider critical update flag** - Force restart for security/critical fixes
4. **Add "What's New" information** - Help users understand update value

---

## 4. Edge Case Analysis

### Scenario: Update Fails Mid-Download

**Current Handling:**
```typescript
const handleDownloadUpdate = async () => {
  try {
    await Updates.fetchUpdateAsync();
  } catch (e) {
    Alert.alert('Error', `Failed to download update: ${e}`);
  }
};
```

**Issues:**
- No automatic retry
- No partial download recovery
- User must manually retry

**Recommendation:**
```typescript
// Suggested improvement
const handleDownloadUpdate = async (retryCount = 0) => {
  try {
    await Updates.fetchUpdateAsync();
  } catch (e) {
    if (retryCount < 3) {
      // Auto-retry with exponential backoff
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return handleDownloadUpdate(retryCount + 1);
    }
    Alert.alert(
      'Download Failed',
      'Unable to download update. Check your connection and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => handleDownloadUpdate(0) }
      ]
    );
  }
};
```

### Scenario: User Closes App During Update

**Current Handling:**
- expo-updates handles this natively
- Download continues in background briefly
- Partial downloads are cleaned up on next launch

**Assessment:** Handled correctly by expo-updates library

### Scenario: Flaky Network

**Current Handling:**
- Single attempt, then error
- No offline detection
- No WiFi preference option

**Recommendations:**
1. Add `@react-native-community/netinfo` for connectivity awareness
2. Queue update check for when connection improves
3. Add `checkAutomatically: "WIFI_ONLY"` option in settings

### Scenario: Corrupt Update / JS Crash

**Current Handling:**
- expo-updates has built-in "emergency launch" fallback
- `ErrorBoundary.tsx` uses `Updates.reloadAsync()` for recovery

**Assessment:** Good! The ErrorBoundary integration is a solid safety net:
```typescript
// From ErrorBoundary.tsx
handleRestart = async () => {
  if (Updates.isEnabled) {
    await Updates.reloadAsync();
  }
};
```

---

## 5. Best Practices Analysis

### Background Updates

**Current Status:** Not implemented

**Recommendation:** Implement using `expo-background-task`:

```typescript
// Suggested implementation
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Updates from 'expo-updates';

const BACKGROUND_UPDATE_TASK = 'background-update-check';

TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    // Note: Don't call reloadAsync() in background - apply on next launch
  }
});

export const setupBackgroundUpdates = async () => {
  await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
    minimumInterval: 60 * 60 * 12, // 12 hours
  });
};
```

**Benefits:**
- Users get updates without opening Settings
- Faster update adoption rate
- Better experience on next app launch

### Version Display

**Current:** Hardcoded `APP_VERSION = '1.0.0'`

**Recommended:**
```typescript
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
const BUILD_NUMBER = Constants.expoConfig?.ios?.buildNumber ??
                     Constants.expoConfig?.android?.versionCode;
```

### Rollback Capability

**Current Status:** Partial - relies on expo-updates emergency launch

**expo-updates Built-in Protections:**
- `isEmergencyLaunch` flag when falling back to embedded bundle
- Automatic rollback on fatal JS errors
- Anti-bricking measures enabled by default

**What's Missing:**
- No manual rollback UI
- No way for users to report "this update broke something"
- No server-side rollback trigger

**Recommendation:** Add emergency rollback detection:
```typescript
useEffect(() => {
  if (Updates.isEmergencyLaunch) {
    // Log to analytics
    console.warn('Emergency launch detected:', Updates.emergencyLaunchReason);
    // Optionally notify user
  }
}, []);
```

### Code Signing

**Current Status:** Not configured

**Recommendation for Production:**
```json
// app.json addition
{
  "updates": {
    "codeSigningCertificate": "./certs/updates-cert.pem",
    "codeSigningMetadata": {
      "alg": "rsa-v1_5-sha256",
      "keyid": "main"
    }
  }
}
```

---

## 6. Summary of Recommendations

### High Priority

| Issue | Recommendation | Effort |
|-------|----------------|--------|
| Version sync | Use expo-constants instead of hardcoded value | Low |
| Retry mechanism | Add automatic retry with backoff | Medium |
| Error messages | User-friendly messages, not raw errors | Low |

### Medium Priority

| Issue | Recommendation | Effort |
|-------|----------------|--------|
| Background updates | Implement expo-background-task | Medium |
| Download progress | Add progress indicator | Medium |
| Network awareness | Add netinfo for connectivity detection | Low |

### Low Priority / Nice-to-Have

| Issue | Recommendation | Effort |
|-------|----------------|--------|
| Critical updates | Add metadata flag for mandatory updates | High |
| What's New | Show changelog on update available | Medium |
| Code signing | Add certificate verification | Medium |
| Update reminder | Re-prompt for dismissed updates | Medium |

---

## 7. Files Reviewed

| File | Purpose |
|------|---------|
| `/Users/brent/wtlfo/app/(settings)/index.tsx` | Settings screen with update UI |
| `/Users/brent/wtlfo/app.json` | Expo configuration including updates |
| `/Users/brent/wtlfo/eas.json` | EAS Build/Update channel configuration |
| `/Users/brent/wtlfo/src/components/ErrorBoundary.tsx` | Error recovery with Updates.reloadAsync |
| `/Users/brent/wtlfo/app/_layout.tsx` | Root layout with ErrorBoundary wrapper |
| `/Users/brent/wtlfo/package.json` | Dependencies including expo-updates v29 |

---

## Conclusion

The update implementation provides a working foundation with good error recovery via the ErrorBoundary component. The main areas for improvement are:

1. **Reliability:** Add retry logic and network awareness
2. **User Experience:** Better progress feedback and reminder system
3. **Proactive Updates:** Implement background update checking
4. **Maintainability:** Sync version display with actual config

The expo-updates library handles most edge cases well at the native level. The JavaScript layer needs enhancement for better user communication and recovery options.
