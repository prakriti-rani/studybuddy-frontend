#!/bin/bash
echo "Starting build process..."

# Install vite globally to ensure we have a working version
npm install -g vite@latest

# Build using the global vite
vite build

echo "Build completed!"
