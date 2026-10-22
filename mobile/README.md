# QueueLess Mobile (React Native / Expo)

QueueLess Mobile is an Expo + React Native application aligned pixel-for-pixel with the official QueueLess Figma design specifications (390x844 viewport).

## Architecture & Design Tokens

- **Viewport Geometry:** Tailored for 390x844 dp with safe area flexbox scaling.
- **Typography:** Google Fonts loaded at startup: Inter (300, 400, 500, 600) and Poppins (400, 500). System fonts are not used.
- **Palette Tokens:**
  - Primary Navy: `#284D83` (Vertical gradient to `#3E6BB2`)
  - Accent / Brand Blues: `#3E6BB2`, `#4988C4`, `#E6EDF7` (brand tint)
  - Status Pills: Open (`#C6E5D2` / `#047857`), Close Soon (`#F3C3AD` / `#F9773B`), Closed (`#F4A8AE` / `#FC0015`), Waiting (`#E6EDF7` / `#284D83`), Now Serving (`#EFFEF5` / `#53A972`)
  - Alert Cards: Info (`#EDF9FF`), Success (`#EFFEF5`), Danger (`#FFF0F0`), Alert (`#FDECEC`), Offer (`#EFFEF5`)
- **Radii:** Input 12, Button 12, Chip 14, Search 16, Tile 16, Bottom Sheet 30, Hero Card 30, Tab Bar 36, Login Sheet 40.
- **Custom Vector Glyphs:** Rendered via `react-native-svg` (`mobile/src/assets/icons/AppIcons.tsx` and `mobile/src/components/LogoQ.tsx`).

---

## Screen & Flow Directory

### Customer Navigation
1. **Splash (`SplashScreen.tsx`):** Solid `#284D83`, white outline Q logo at y=336, wordmark at y=451, smooth fade/scale animation, 1.2s hydration gate.
2. **Onboarding (`OnboardingScreen.tsx`):** 3 full-bleed horizontal slides with vector blobs, animated dots at y=648, and "Get Started" button setting `ql_onboarding_seen`.
3. **Login (`LoginScreen.tsx`):** 214dp `#284D83` hero with white typography, overlapping 40dp-radius sheet, eye toggle, full-width gradient button.
4. **Register (`RegisterScreen.tsx`):** Customer vs Business role selector tiles, +91 phone prefix, consent checkbox with legal links.
5. **Customer Tabs (`BottomTabBar.tsx`):**
   - 64dp white tab bar with 36dp top corner radius.
   - Active icon filled `#284D83` with a 12x4 `#284D83` pill indicator 8px below.
   - Tabs: **Home**, **Notifications** (with 8px `#FC0015` unread indicator), **Updates** (Megaphone), **My Queue** (Q bubble glyph).
6. **Scan & Join / Store Detail (`ScanJoinScreen.tsx`):** Manual code entry card or camera scanner modal; loads Detail-1 with radius 30 hero, faint Q watermark, and sticky bottom action bar.
7. **Queue Status (`QueueStatusScreen.tsx`):** Progress track with green nodes & fill fraction, Truthful Note box, QR token card, selected services stepper sheet, and leave queue confirmation dialog.
8. **Notifications Feed (`NotificationsScreen.tsx`):** Grouped by day (Today, Yesterday, N days ago), AlertCard palettes by type, 8px unread dot, automatic mark-as-read on screen focus.
9. **Updates Feed (`UpdatesScreen.tsx`):** Chip filters (All, Alerts, Offers, Info), grouped by day, offer expiration dates, and badge glyphs.
10. **Booking History (`BookingHistoryScreen.tsx`):** Design search bar (#F7F7F7, radius 16), visit stats, and `ListRow` items.
11. **Profile (`ProfileScreen.tsx`):** 64px gradient avatar, 20px outline icon rows, theme mode selector, outline sign-out button.

### Business Navigation
1. **Business Dashboard (`BusinessDashboardScreen.tsx`):**
   - Chip row tabs: **Queue**, **Analytics**, **Catalog**, and **Updates**.
   - "New Update" 30dp-radius bottom sheet with live card preview, type chips, character counters, and offer duration stepper.
   - Queue operation controls: advance, verify ticket, call next, complete, cancel.

---

## Part C — Push Notifications & EAS Setup

Remote OS push notifications for `turn_near` and `your_turn` are supported via the Expo Push API (`https://exp.host/--/api/v2/push/send`).

### Important Note for Expo SDK 52+:
Remote push notifications require a custom Development Build (EAS Build) or a standalone release; Expo Go on modern SDK versions cannot receive remote background pushes without an explicit EAS project configuration.

1. Ensure `extra.eas.projectId` is set in `app.json`:
   ```json
   {
     "expo": {
       "extra": {
         "eas": {
           "projectId": "<YOUR-EAS-PROJECT-ID>"
         }
       }
     }
   }
   ```
2. Build a development client:
   ```bash
   npx eas-cli build --profile development --platform android
   ```
3. Contextual Permission Request: The app prompts for notification permissions immediately following the customer's first successful queue join.

---

## Development & Testing

### Running Typecheck & Lint
```bash
# In /mobile
npx tsc --noEmit
npm run lint
```

### Running Backend Dev Seed Script
Populates Figma-accurate mock notifications & announcements:
```bash
# In /backend
npm run seed:feed
```

### Running Visual Diff Tool
Verifies implemented screens against `/mobile/design-reference/figma`:
```bash
# In /mobile
node tools/figma/diff.mjs
```
