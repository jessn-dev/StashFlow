#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

echo "🚀 Starting FinTrack Workspace Initialization..."

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is required but not installed."
    echo "💡 Please install Node.js v22.x LTS (https://nodejs.org/) before running this script."
    exit 1
fi

# 2. Check for pnpm and install standalone if missing
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpm not found. Installing standalone pnpm via curl..."
    curl -fsSL https://get.pnpm.io/install.sh | sh -

    # Dynamically set PNPM_HOME based on OS for this script's execution
    if [[ "$OSTYPE" == "darwin"* ]]; then
        export PNPM_HOME="$HOME/Library/pnpm"
    else
        export PNPM_HOME="$HOME/.local/share/pnpm"
    fi
    export PATH="$PNPM_HOME:$PATH"
fi

echo "✅ Using Node $(node -v) and pnpm $(pnpm -v)"

# 3. Initialize Workspace
echo "📁 Creating workspace structure..."
pnpm init
npm pkg set private=true
npm pkg set packageManager="pnpm@10.33.0"

cat <<EOF > pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
EOF

mkdir -p apps packages

# 4. Install Root Dependencies
echo "⚡ Installing Turborepo and TypeScript..."
pnpm add -wD turbo@latest typescript@latest @types/node@latest

# 5. Scaffold Apps (--yes auto-accepts prompts)
echo "🌐 Scaffolding Next.js Web App..."
cd apps
pnpm dlx create-next-app@15 web --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*" --use-pnpm --yes

echo "📱 Scaffolding Expo Mobile App..."
pnpm dlx create-expo-app@latest mobile --template expo-template-blank-typescript --yes
cd ..

# 6. Scaffold Shared Packages
echo "📦 Scaffolding internal packages..."
cd packages

mkdir -p core/src ui/src api/src

cd core && pnpm init && npm pkg set name="@fintrack/core" version="0.1.0" main="src/index.ts" && touch src/index.ts && cd ..
cd ui && pnpm init && npm pkg set name="@fintrack/ui" version="0.1.0" main="src/index.ts" && touch src/index.ts && cd ..
cd api && pnpm init && npm pkg set name="@fintrack/api" version="0.1.0" main="src/index.ts" && touch src/index.ts && pnpm add @supabase/supabase-js@latest && cd ../..

# 7. Configure Turborepo Pipeline
echo "⚙️ Configuring Turborepo..."
cat <<EOF > turbo.json
{
  "\$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "clean": {
      "cache": false
    }
  }
}
EOF

# 8. Add Root Scripts
npm pkg set scripts.dev="turbo run dev"
npm pkg set scripts.build="turbo run build"
npm pkg set scripts.lint="turbo run lint"

# 9. Final Link & Install
echo "🔗 Linking workspace dependencies..."
pnpm install

echo "========================================================"
echo "🎉 FinTrack Scaffold Complete!"
echo "⚠️ IMPORTANT: If pnpm was just installed, run this command"
echo "   to refresh your terminal before doing anything else:"
echo ""
echo "   source ~/.zshrc   (or source ~/.bash_profile)"
echo "========================================================"
echo "Then, run 'pnpm dev' to start the servers."