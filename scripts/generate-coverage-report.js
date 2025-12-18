#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate a markdown coverage report from Jest coverage-summary.json
 */

const testType = process.argv[2] || 'unit';
const coverageFile = path.join(
  __dirname,
  '..',
  'coverage',
  'apps',
  'api',
  testType,
  'coverage-summary.json'
);

if (!fs.existsSync(coverageFile)) {
  console.error(`❌ Coverage file not found: ${coverageFile}`);
  console.error(`Tests may have failed before coverage could be collected.`);

  // Generate a failure report instead
  const reportDir = path.join(__dirname, '..', 'test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const failureReport = `## ❌ ${testType.charAt(0).toUpperCase() + testType.slice(1)} Test Coverage

**Status**: Tests failed before coverage could be collected

This usually means:
- Tests crashed or had compilation errors
- No tests were executed
- Coverage collection was not enabled

Check the test logs for more details.
`;

  const reportFile = path.join(reportDir, `coverage-${testType}.md`);
  fs.writeFileSync(reportFile, failureReport);
  console.log(`⚠️ Failure report generated: ${reportFile}`);
  process.exit(0);
}

const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
const { total } = coverage;

// Helper to get badge emoji
function getBadge(percentage) {
  if (percentage >= 80) return '🟢';
  if (percentage >= 60) return '🟡';
  return '🔴';
}

// Helper to create progress bar
function createProgressBar(percentage) {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

// Generate report
const report = `## ${getBadge(total.lines.pct)} ${testType.charAt(0).toUpperCase() + testType.slice(1)} Test Coverage

| Metric | Coverage | Progress |
|--------|----------|----------|
| Lines | ${total.lines.pct}% | ${createProgressBar(total.lines.pct)} |
| Statements | ${total.statements.pct}% | ${createProgressBar(total.statements.pct)} |
| Functions | ${total.functions.pct}% | ${createProgressBar(total.functions.pct)} |
| Branches | ${total.branches.pct}% | ${createProgressBar(total.branches.pct)} |

**Coverage Details:**
- ✅ Covered: ${total.lines.covered} / ${total.lines.total} lines
- ❌ Uncovered: ${total.lines.total - total.lines.covered} lines
`;

// Write report
const reportDir = path.join(__dirname, '..', 'test-reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const reportFile = path.join(reportDir, `coverage-${testType}.md`);
fs.writeFileSync(reportFile, report);

console.log(`✅ Coverage report generated: ${reportFile}`);
console.log(`Coverage: ${total.lines.pct}%`);
