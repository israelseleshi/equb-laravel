# Equb — Expo React Native + Laravel Backend

This is the Equb mobile application with an Expo + TypeScript React Native frontend and a Laravel PHP backend.

## Tech Stack

### Frontend
- **Framework:** Expo SDK 57+
- **Language:** TypeScript (strict mode)
- **UI:** React Native core components, StyleSheet
- **Navigation:** Custom navigation context (not Expo Router)
- **Testing:** Jest for unit, Maestro for E2E

### Backend
- **Framework:** Laravel with Fortify authentication
- **Language:** PHP 8.4
- **API:** Sanctum token-based auth
- **Database:** SQLite
- **Testing:** Pest / PHPUnit
- **Formatting:** Laravel Pint (PSR-12)

### AI Tooling (ECC — Everything Claude Code)
- **ECC version:** 2.0.0-rc.1 (installed at `C:\Users\Hp\ECC`)
- **Skills:** 251 specialized skills loaded via opencode.jsonc
- **Commands:** 80+ ECC commands (`npx ecc <command>`)
- **Agents:** 63 specialized agents for code review, planning, TDD, security, etc.
- **Rules:** TypeScript, React/Expo, PHP/Laravel rules linked from ECC

## Commands

```bash
# Frontend (run from mobile-app/)
cd mobile-app
npm run start        # Start Expo dev server (use --tunnel if device issues)
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run web          # Run on Web
npm test             # Run frontend tests
npm run lint         # Frontend lint
npx expo install --fix  # Fix dependency alignment
npx expo doctor        # Verify SDK health

# Backend (run from backend/)
cd backend
composer install     # Install PHP deps
vendor/bin/pint      # Format PHP code
vendor/bin/phpstan   # Static analysis
php artisan test     # Run backend tests

# ECC (run from project root)
cd ../..
npx ecc react         # React/Expo agent assistance
npx ecc plan          # Plan a feature
npx ecc code-review   # Review code changes
npx ecc security-scan # Security audit
```

## Coding Standards

### TypeScript / React Native
- **Immutability:** Never mutate objects/arrays
- **Types:** Interfaces over types, no `any`, strict mode
- **Naming:** `camelCase` for vars/functions, `PascalCase` for components
- **Components:** Functional with named exports, props typed via interface

### PHP / Laravel
- Follow PSR-12 formatting (enforced by Pint)
- Controllers are thin, business logic in services/actions
- Use Form Requests for validation
- Eloquent models with proper `$fillable`, `$casts`, `$hidden`
- Sanctum tokens for API auth
- Write tests first (TDD), 80%+ coverage

## Project Structure

```
equb/
├── .opencode/               # ECC skills, rules, commands, agents
├── AGENTS.md                # This file
├── opencode.jsonc           # Opencode config
├── mobile-app/              # Expo React Native frontend
│   ├── App.tsx
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── assets/
│   └── src/
│       ├── screens/         # Screen components
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth, navigation contexts
│       ├── services/        # API client, storage
│       ├── data/            # Models, seed data
│       ├── i18n/            # Translations
│       └── theme/           # Colors, fonts
└── backend/                 # Laravel PHP backend
    ├── bootstrap/app.php
    ├── routes/api.php
    ├── app/
    │   ├── Models/
    │   ├── Http/Controllers/Api/
    │   └── Http/Middleware/
    ├── database/
    │   ├── migrations/
    │   └── seeders/
    └── public/.htaccess
```

## Expo Go — Fixing "Stalled on Old Version"

If Expo Go shows version 56 on your device:

1. **Update the Expo Go app** on your phone from Google Play (Android) or App Store (iOS) — you need Expo Go 2.33.0+ for SDK 57
2. **Clear cache** on the dev server: `npx expo start -c`
3. **Use tunnel** if on different network: `npx expo start --tunnel`
4. **Verify** with: `npx expo doctor`

## Security

- No hardcoded secrets
- Validate all user inputs
- Never log sensitive data (passwords, tokens, PII)
- Environment variables for sensitive config
- Sanctum Bearer token auth for API
- Eloquent ORM prevents SQL injection

## Communication Style

- Always respond with emojis in every message 🎯
- Use relevant emojis to enhance clarity and engagement ✨
- Match emoji tone to the context (🚀 for progress, ⚠️ for warnings, ✅ for completions)
