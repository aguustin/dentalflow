# @dentalflow/mobile

React Native (Expo) mobile application for DentalFlow.

## Stack

- **Framework:** React Native 0.74 + Expo SDK 51
- **Router:** Expo Router (file-based)
- **Language:** TypeScript (strict)
- **Push notifications:** TBD (Expo Notifications)
- **Offline:** TBD (MMKV / WatermelonDB)

## Intended users

Patients and dentists accessing DentalFlow on iOS or Android phones. The mobile app focuses on a subset of features compared to the web app.

## Planned feature areas

| Area | Description |
|---|---|
| Auth | Login, biometric unlock |
| Appointments | View upcoming, request cancellation |
| Records | View personal dental history |
| Notifications | Appointment reminders, alerts |
| (Dentist mode) | Quick schedule view, patient lookup |

## Development

```bash
pnpm start     # Start Expo dev server
pnpm android   # Open on Android emulator
pnpm ios       # Open on iOS simulator
pnpm typecheck # Type-check without emitting
```

## Structure (planned)

```
src/
  app/          # Expo Router file-based routes
  features/     # Domain feature modules
  shared/       # Shared hooks, components, utils
```

> No business logic is implemented yet. This is infrastructure scaffolding only.
