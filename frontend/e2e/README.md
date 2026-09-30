# StockAI Frontend Playwright E2E Test Suite

Comprehensive browser-level end-to-end (E2E) testing suite for the StockAI industrial manufacturing frontend.

## Prerequisites

Before running the E2E test suite:

1. **Backend Server** running on `http://localhost:8080`:
   ```bash
   ./mvnw spring-boot:run
   ```
2. **Frontend Dev Server** running on `http://localhost:5176`:
   ```bash
   cd frontend
   npm run dev
   ```

## Test Commands

Run from the `frontend/` directory:

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Run E2E tests in interactive UI mode
npm run test:e2e:ui
```

## Test Suites & Coverage

| Test ID | Suite / File | Coverage Description | Seeded Account / Fixture |
|:---|:---|:---|:---|
| **TEST A** | `e2e/auth.spec.ts` | Login page elements, invalid credentials rejection, session isolation | None (invalid credentials) |
| **TEST B** | `e2e/auth.spec.ts` | Non-MFA standard role authentication & landing redirection | `operator01` / `operator123` |
| **TEST C** | `e2e/auth.spec.ts` | Administrator two-factor auth (MFA) challenge, 6-digit TOTP input, invalid code rejection, back navigation | `admin` / `admin123` |
| **TEST D** | `e2e/rbac.spec.ts` | Protected route enforcement, unauthenticated redirection to `/login`, role-specific landing preservation | LocalStorage session fixture |
| **TEST E** | `e2e/smoke.spec.ts` | Factory Operations Dashboard rendering, metrics cards, refresh action | LocalStorage session fixture |
| **TEST F** | `e2e/smoke.spec.ts` | Raw Materials catalog rendering & controls | LocalStorage session fixture |
| **TEST G** | `e2e/smoke.spec.ts` | Production Work & WIP queue rendering | LocalStorage session fixture |
| **TEST H** | `e2e/smoke.spec.ts` | Quality inspections ledger & gate verification | LocalStorage session fixture |
| **TEST I** | `e2e/smoke.spec.ts` | Move Stock (Transfers) & Digital Twin map | LocalStorage session fixture |
| **TEST J** | `e2e/smoke.spec.ts` | Need to Buy (Reorder recommendations) triggers | LocalStorage session fixture |
| **TEST K** | `e2e/responsive.spec.ts` | Mobile (375px), Tablet (768px), and Desktop (1440px) viewport checks; verifies no page-level horizontal overflow | LocalStorage session fixture |
| **TEST L** | `e2e/error-handling.spec.ts` | Intercepted downstream API 500 error state rendering without application crash | LocalStorage session fixture (mocked route) |

## Test Safety & Production Hygiene

- **Zero Destructive Actions**: Tests strictly perform read-only navigation, form submission challenges, and UI element verification.
- **No Hard-coded Secrets**: Credentials use only local development seed accounts (`operator01` / `admin`).
- **MFA Security**: Valid TOTP completion is not bypassed; the challenge gate and invalid OTP handling are tested against the real backend filter chain.
