#!/bin/bash

# Build script for Piral Feed Service
set -e

echo "🏗️  Building Piral Feed Service..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linting..."
npm run lint

# Run tests
echo "🧪 Running tests..."
npm run test

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create production directories
echo "📁 Creating production directories..."
mkdir -p data storage logs

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t piral-feed-service:latest .

echo "✅ Build completed successfully!"
echo ""
echo "🚀 To run the service:"
echo "   docker run -p 3000:3000 -v \$(pwd)/data:/app/data -v \$(pwd)/storage:/app/storage piral-feed-service:latest"
echo ""
echo "📚 Or use docker-compose:"
echo "   docker-compose up -d"