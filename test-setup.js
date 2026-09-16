#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧠 Second Brain Dashboard - Setup Verification\n');

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

console.log(`📋 System Check:`);
console.log(`   Node.js version: ${nodeVersion}`);

if (majorVersion < 16) {
  console.log('   ❌ Node.js 16+ required');
  process.exit(1);
} else {
  console.log('   ✅ Node.js version compatible');
}

// Check if package.json exists
const packageJsonExists = fs.existsSync('package.json');
console.log(`   package.json: ${packageJsonExists ? '✅ Found' : '❌ Missing'}`);

// Check if client directory exists
const clientExists = fs.existsSync('client');
console.log(`   client directory: ${clientExists ? '✅ Found' : '❌ Missing'}`);

// Check if .env file exists
const envExists = fs.existsSync('.env');
console.log(`   .env file: ${envExists ? '✅ Found' : '⚠️  Missing (copy from .env.example)'}`);

// Check if node_modules exists
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`   dependencies: ${nodeModulesExists ? '✅ Installed' : '❌ Run npm install'}`);

// Check if client node_modules exists
const clientNodeModulesExists = fs.existsSync('client/node_modules');
console.log(`   client dependencies: ${clientNodeModulesExists ? '✅ Installed' : '❌ Run cd client && npm install'}`);

console.log('\n🚀 Quick Start Commands:');
console.log('   Development: npm run dev');
console.log('   Production:  npm start');
console.log('   Docker:      docker-compose up -d');

console.log('\n📚 Documentation:');
console.log('   Setup:       README.md');
console.log('   Deployment:  DEPLOYMENT.md');

if (!envExists) {
  console.log('\n⚠️  Next Steps:');
  console.log('   1. Copy .env.example to .env');
  console.log('   2. Configure your environment variables');
  console.log('   3. Set up MongoDB (local or Atlas)');
  console.log('   4. Run npm run dev to start development');
}

console.log('\n✨ Happy organizing!');