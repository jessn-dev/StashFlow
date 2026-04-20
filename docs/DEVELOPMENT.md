# StashFlow: Development Guide

Welcome to the StashFlow engineering team! This guide provides everything you need to know about building, testing, and contributing to the project.

## 1. Local Environment Setup

StashFlow is a **Turborepo** monorepo using **pnpm** for package management.

### Prerequisites
*   **Node.js**: v22.x LTS (Recommended)
*   **pnpm**: v10.x
*   **Supabase CLI**: Required for local database development.
*   **Expo Go**: For testing the mobile app on physical devices.

### Installation
The project includes a comprehensive bootstrap script that automates the monorepo initialization, pnpm installation, and workspace linking.

```bash
# 1. Clone the repository
git clone https://github.com/your-username/stashflow.git
cd stashflow

# 2. Run the automated bootstrap
# This validates your Node version and initializes all apps and packages.
chmod +x setup.sh
./setup.sh init

# 3. Initialize local Supabase
supabase start
supabase db reset # Apply migrations and seed data
```

### Environment Variables
*   **Web**: Copy `apps/web/.env.example` to `.env.local`
*   **Mobile**: Copy `apps/mobile/.env.example` to `.env`
*   **Note**: Ensure `FRED_API_KEY` is set in `.env.local` for Market Intelligence features.

---

## 2. Mobile Development Setup

To develop and test the mobile application, you must configure your local machine for iOS and Android simulation.

### iOS (macOS Only)
1.  **Xcode**: Install Xcode from the Mac App Store.
2.  **Command Line Tools**: Run `xcode-select --install`.
3.  **CocoaPods**: Install via `brew install cocoapods`.
4.  **Simulator**: Open Xcode -> Settings -> Platforms to download iOS simulators.

### Android
1.  **Android Studio**: Download and install Android Studio.
2.  **SDKs**: Use the SDK Manager to install the latest Android SDK and Build Tools.
3.  **ADB**: Ensure `adb` is in your system PATH.
4.  **Emulator**: Create a Virtual Device (AVD) using the Device Manager in Android Studio.

### Physical Devices (Expo Go)
1.  Install the **Expo Go** app from the App Store or Play Store.
2.  Ensure your phone and computer are on the same Wi-Fi network.
3.  **Network Configuration**: Use your machine's **Local IP** (e.g., `192.168.x.x`) in the mobile `.env` so the device can reach your local Supabase instance.
4.  Run `pnpm dev` and scan the QR code displayed in the terminal.

---

## 3. Development Workflow

### Standard Commands
| Command | Description |
|---|---|
| `pnpm dev` | Start Web, Mobile, and API development servers. |
| `pnpm build` | Run a full monorepo build. |
| `pnpm lint` | Run ESLint across all packages. |

### Database Migrations
We use Supabase local development for schema changes.
1.  Make changes in the Supabase dashboard or SQL editor.
2.  Pull changes: `supabase db pull`
3.  Apply to team: Migrations are stored in `supabase/migrations/` and should be committed to Git.

---

## 3. Testing Standards

We maintain high standards for financial logic integrity. We use **Vitest** for units and **Cypress** (planned) for E2E.

### Commands
*   **Run All Tests**: `pnpm test`
*   **Check Coverage**: `pnpm test:coverage`
*   **Pre-commit Hook**: A Git hook (Husky) automatically runs tests on staged files before every commit.

### Coverage Targets
*   **Business Logic (`@stashflow/core`)**: 90%+ Branch Coverage.
*   **API/UI Integration**: 70%+ Coverage.

---

## 4. Monorepo Architecture

*   **`apps/web`**: Next.js 16 application using Tamagui for high-fidelity UI.
*   **`apps/mobile`**: Expo React Native application sharing 80% of logic with web.
*   **`packages/core`**: The "Financial Brain". Pure TypeScript logic for amortization, DTI, and currency math.
*   **`packages/api`**: Data access layer. Handles Supabase client initialization and complex query aggregations.
*   **`packages/theme`**: Shared Tamagui design system (tokens, fonts, colors).

---

## 5. Deployment
*   **Web**: Automated via Vercel on merge to `main`.
*   **Mobile**: Build via Expo EAS.
*   **Edge Functions**: Deploy using `supabase functions deploy [name]`.
