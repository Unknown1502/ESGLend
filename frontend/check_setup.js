#!/usr/bin/env node

/**
 * Frontend Health Check Script
 * Verifies that the frontend is properly configured
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log(`✅ ${description}: Found`);
    return true;
  } else {
    console.log(`❌ ${description}: NOT FOUND`);
    return false;
  }
}

function checkPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('✅ package.json: Valid');
    
    const requiredDeps = [
      '@mui/material',
      'axios',
      'react',
      'react-router-dom',
      'recharts'
    ];
    
    let allFound = true;
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep}: NOT FOUND`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    console.log(`❌ package.json: Error reading file`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function checkNodeModules() {
  if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules: Installed');
    return true;
  } else {
    console.log('❌ node_modules: NOT FOUND');
    console.log('   → Run: npm install');
    return false;
  }
}

function checkEnvVariables() {
  const envPath = '.env';
  const envLocalPath = '.env.local';
  
  if (fs.existsSync(envPath) || fs.existsSync(envLocalPath)) {
    console.log('✅ Environment file: Found');
    return true;
  } else {
    console.log('ℹ️  Environment file: Not found (optional)');
    console.log('   Default API URL will be used: http://127.0.0.1:8000');
    return true;
  }
}

function checkSourceFiles() {
  const requiredFiles = [
    { path: 'src/App.tsx', desc: 'Main App component' },
    { path: 'src/api/apiClient.ts', desc: 'API Client' },
    { path: 'src/pages/Loans/Loans.tsx', desc: 'Loans page' },
    { path: 'src/pages/Loans/LoanDetail.tsx', desc: 'Loan Detail page' },
    { path: 'src/pages/Dashboard/Dashboard.tsx', desc: 'Dashboard page' },
  ];
  
  let allFound = true;
  requiredFiles.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allFound = false;
    }
  });
  
  return allFound;
}

function main() {
  console.log('='.repeat(60));
  console.log('ESGLend Frontend Health Check');
  console.log('='.repeat(60));
  console.log();
  
  // Check package.json
  console.log('📦 Package Configuration:');
  const packageOk = checkPackageJson();
  console.log();
  
  // Check node_modules
  console.log('📚 Dependencies:');
  const depsOk = checkNodeModules();
  console.log();
  
  // Check environment
  console.log('🔧 Environment:');
  checkEnvVariables();
  console.log();
  
  // Check source files
  console.log('📁 Source Files:');
  const filesOk = checkSourceFiles();
  console.log();
  
  // Summary
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  
  if (packageOk && depsOk && filesOk) {
    console.log('✅ All checks passed! Your frontend is ready.');
    console.log();
    console.log('Start the development server with:');
    console.log('   npm run dev');
    console.log();
    console.log('The app will be available at:');
    console.log('   http://localhost:3000');
    console.log();
    console.log('⚠️  Make sure the backend is running at:');
    console.log('   http://localhost:8000');
  } else {
    console.log('⚠️  Some issues found. Please fix them before running.');
    console.log();
    if (!depsOk) {
      console.log('1. Install dependencies: npm install');
    }
    if (!filesOk) {
      console.log('2. Verify all source files are present');
    }
  }
}

main();
