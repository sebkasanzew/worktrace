#!/bin/bash
set -e

echo "Checking signing configuration..."

# Check if private key env var is set
if [ -z "$TAURI_SIGNING_PRIVATE_KEY" ]; then
    if [ -f "app.key" ]; then
        echo "Using app.key from project root."
        export TAURI_SIGNING_PRIVATE_KEY=$(cat app.key)
    else
        echo "Error: TAURI_SIGNING_PRIVATE_KEY not set and app.key not found."
        exit 1
    fi
fi

# Check if password env var is set
if [ -z "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" ]; then
    echo "Please enter the password for the signing key:"
    read -s TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    echo "Password set."
fi

echo "Building application with updater artifacts..."
# Run build
pnpm tauri build

echo "Generating latest.json..."
node scripts/generate-latest-json.js

echo "Checking for artifacts..."
# Check artifacts
FOUND_ALL=true

if [ -f "src-tauri/target/release/bundle/macos/Worktrace.app.tar.gz" ]; then
    echo "✅ Updater artifact .tar.gz found!"
else
    echo "❌ Updater artifact .tar.gz NOT found!"
    FOUND_ALL=false
fi

if [ -f "src-tauri/target/release/bundle/macos/Worktrace.app.tar.gz.sig" ]; then
    echo "✅ Updater artifact .sig found!"
else
    echo "❌ Updater artifact .sig NOT found!"
    FOUND_ALL=false
fi

if [ -f "src-tauri/target/release/bundle/macos/latest.json" ]; then
    echo "✅ latest.json found!"
else
    echo "❌ latest.json NOT found!"
    FOUND_ALL=false
fi

if [ "$FOUND_ALL" = true ]; then
    echo "🎉 Success! All updater artifacts were generated."
    exit 0
else
    echo "⚠️  Some artifacts are missing."
    exit 1
fi
