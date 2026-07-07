# Equb — Expo React Native + Laravel Backend

This is the Equb mobile application with an Expo + TypeScript React Native frontend and a Laravel PHP backend.

## Tech Stack

### Frontend
- **Framework:** Expo SDK 56+
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

## Commands

```bash
# Frontend (run from mobile-app/)
cd mobile-app
npm run start        # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run web          # Run on Web
npm test             # Run frontend tests
npm run lint         # Frontend lint

# Backend (run from backend/)
cd backend
composer install     # Install PHP deps
vendor/bin/pint      # Format PHP code
vendor/bin/phpstan   # Static analysis
php artisan test     # Run backend tests
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
