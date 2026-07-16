# Laravel Backend — Agents & Skills

## Always-On Skills

These skills are loaded automatically and should be followed for all Laravel work:

| Skill | Purpose |
|-------|---------|
| `laravel-patterns` | Architecture, Eloquent ORM, service layer, queues, events, caching |
| `laravel-security` | Auth, CSRF, validation, mass assignment, rate limiting, secrets |
| `laravel-tdd` | TDD with PHPUnit/Pest, factories, database testing, coverage |
| `laravel-verification` | Pre-deployment checks: lint, static analysis, tests, security scan |
| `laravel-plugin-discovery` | Plugin/package discovery patterns |

## Always-On Rules

| Rule | Purpose |
|------|---------|
| `rules/php/coding-style` | PSR-12, strict types, Pint, PHPStan |
| `rules/php/patterns` | Thin controllers, DTOs, DI, service layer |
| `rules/php/security` | Input validation, prepared statements, secrets |
| `rules/php/testing` | PHPUnit/Pest, test organization, factories |
| `rules/php/hooks` | Auto-format, static analysis hooks |

## Default Commands

```json
{
  "build": ["composer install"],
  "test": ["php artisan test", "vendor/bin/phpunit", "vendor/bin/pest"],
  "lint": ["vendor/bin/phpstan analyse", "vendor/bin/pint"],
  "format": ["vendor/bin/pint"]
}
```

## Code Standards

- PSR-12 formatting with Laravel Pint
- PHPStan level 6+ static analysis
- 80%+ test coverage target
- `declare(strict_types=1)` in all new files
- Type hints and return types everywhere

## Workflow

1. Run `vendor/bin/pint` before committing
2. Run `php artisan test` after changes
3. Run `php artisan migrate:fresh --seed` when modifying schema
4. Verify with `vendor/bin/phpstan analyse` before pushing
