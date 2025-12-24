#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FILES = ['test-reporter.ts', 'jest-custom-reporter.ts'];
const OUTPUT_DIR = __dirname;
const ROOT_DIR = path.join(__dirname, '../../../..');

console.log('🔨 Building Jest custom reporter...\n');

try {
  FILES.forEach(file => {
    const tsFile = path.join(__dirname, file);
    const jsFile = path.join(__dirname, file.replace('.ts', '.js'));

    console.log(`  Compiling ${file}...`);

    try {
      execSync(
        `npx tsc "${tsFile}" --outDir "${OUTPUT_DIR}" --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule --moduleResolution node`,
        { cwd: ROOT_DIR, stdio: 'pipe' }
      );

      if (fs.existsSync(jsFile)) {
        console.log(`  ✅ ${file} compiled`);
      }
    } catch (err) {
      if (fs.existsSync(jsFile)) {
        console.log(`  ✅ ${file} compiled (with warnings)`);
      } else {
        throw err;
      }
    }
  });

  console.log('\n✅ Reporter build complete!\n');
} catch (error) {
  console.error('\n❌ Reporter build failed');
  console.error('Note: Tests will run without custom reporter\n');
  process.exit(0);
}
