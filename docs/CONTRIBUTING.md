# 🛠️ StashFlow Developer Setup & Workflow Guide

Welcome to StashFlow! This document outlines the required steps to initialize your local development environment, set up the database, and adhere to our security standards.

## 🚀 1. Prerequisites
Before cloning the repository, ensure you have the following installed on your machine:
* **Node.js**: v22.x LTS
* **Docker Desktop**: Required to run the local Supabase backend.
* **Git**: To clone the repository.

## 📦 2. Initial Workspace Setup
We use a unified bootstrap script to ensure all developers have identical monorepo environments.

Run the following commands from the repository root:
```bash
# Make the setup script executable and run it
chmod +x setup.sh
./setup.sh
```
*⚠️ Important: If the script installed pnpm for you, you MUST refresh your terminal profile before running any other commands:*

```bash
source ~/.zshrc  # For macOS/Zsh users
# OR
source ~/.bash_profile  # For Bash users
```

## 🗄️ 3. First-Time Database Setup & Environment Variables
StashFlow uses a local-first Supabase environment. You need to start the database and link it to the frontends.

Step A: Start the Local DatabaseMake sure Docker is running, then execute:
```bash
pnpm db:start
```
*Note: The first time you run this, Docker will download the Supabase images. This may take a few minutes.*

Step B: Configure Environment Variables
When `pnpm db:start` finishes, your terminal will print out your local Supabase credentials `(API URL and anon key)`. You need to add these to your environment files.

1. Create a .env.local file in the Web App (apps/web/.env.local):
```
NEXT_PUBLIC_SUPABASE_URL=[http://127.0.0.1:54321](http://127.0.0.1:54321)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_printed_anon_key_here
```
2. Create a .env file in the Mobile App (apps/mobile/.env):
```
EXPO_PUBLIC_SUPABASE_URL=[http://127.0.0.1:54321](http://127.0.0.1:54321)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_printed_anon_key_here
```

## 💻 4. Running the Apps
With the database running and environment variables set, spin up the development servers:
```bash
pnpm dev
```
* Web App: http://localhost:3000
* Mobile App: http://localhost:8081 (Metro Bundler)
* Local Supabase Studio: http://localhost:54323 (Use this to view your local database UI)
## 🔄 5. Database Update Protocol (Migrations)
Never make permanent schema changes via the Supabase Studio UI. All changes must be codified in migration files so the rest of the team can pull them.

| Task             |           Command                 |                                                                                             Description   |
|------------------|:---------------------------------:|----------------------------------------------------------------------------------------------------------:|
| Start Backend    |           pnpm db:start           |                                                                               Boots the local containers. |
| Apply Migrations |           pnpm db:reset           | Wipes local DB and cleanly applies all migrations in order. Run this when you pull new code from develop. |
| Sync Types       |           pnpm db:types           |                            Generates strict TypeScript interfaces from the DB schema into @stashflow/core. |
| New Migration    | npx supabase migration new <name> |                                                    Creates a new timestamped SQL file for schema changes. |

*Note: Always run pnpm db:types after modifying the database schema or pulling a new migration to ensure the web and mobile apps maintain type safety.*