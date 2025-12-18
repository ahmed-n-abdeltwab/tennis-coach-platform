#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate a comprehensive test summary from JUnit XML and coverage data
 * No external dependencies - uses simple regex parsing
 */

const testType = process.argv[2] || 'unit';
const junitFile = path.join(__dirname, '..', 'test-reports', `junit-${testType}.xml`);
const coverageFile = path.join(
  __dirname,
  '..',
  'coverage',
  'apps',
  'api',
  testType,
  'coverage-summary.json'
);

function parseJUnitXML(xmlContent) {
  const testsuiteMatch = xmlContent.match(/<testsuite[^>]*>/);
  if (!testsuiteMatch) return null;

  const attrs = testsuiteMatch[0];
  const tests = (attrs.match(/tests="(\d+)"/) || [])[1] || '0';
  const failures = (attrs.match(/failures="(\d+)"/) || [])[1] || '0';
  const errors = (attrs.match(/errors="(\d+)"/) || [])[1] || '0';
  const skipped = (attrs.match(/skipped="(\d+)"/) || [])[1] || '0';
  const time = (attrs.match(/time="([\d.]+)"/) || [])[1] || '0';

  return {
    tests: parseInt(tests),
    failures: parseInt(failures),
    errors: parseInt(errors),
    skipped: parseInt(skipped),
    time: parseFloat(time),
  };
}

function generateSummary() {
  const reportDir = path.join(__dirname, '..', 'test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  let report = `## 📋 ${testType.charAt(0).toUpperCase() + testType.slice(1)} Test Summary\n\n`;

  if (fs.existsSync(junitFile)) {
    try {
      const xmlData = fs.readFileSync(junitFile, 'utf8');
      const stats = parseJUnitXML(xmlData);

      if (stats) {
        const passed = stats.tests - stats.failures - stats.errors - stats.skipped;
        const passRate = stats.tests > 0 ? ((passed / stats.tests) * 100).toFixed(1) : 0;

        report += `| Metric | Count |\n`;
        report += `|--------|-------|\n`;
        report += `| Total Tests | ${stats.tests} |\n`;
        report += `| ✅ Passed | ${passed} |\n`;
        report += `| ❌ Failed | ${stats.failures + stats.errors} |\n`;
        report += `| ⏭️ Skipped | ${stats.skipped} |\n`;
        report += `| Pass Rate | ${passRate}% |\n`;
        report += `| ⏱️ Duration | ${stats.time.toFixed(2)}s |\n\n`;

        if (stats.failures + stats.errors > 0) {
          report += `**Failed Tests:**\n`;
          const testcaseMatches = xmlData.matchAll(
            /<testcase[^>]*name="([^"]*)"[^>]*classname="([^"]*)"[^>]*>[\s\S]*?<(failure|error)[^>]*>/g
          );
          for (const match of testcaseMatches) {
            report += `- ${match[2]} → ${match[1]}\n`;
          }
          report += `\n`;
        }
      }
    } catch (error) {
      report += `⚠️ Could not parse test results: ${error.message}\n\n`;
    }
  } else {
    report += `⚠️ No test results found\n\n`;
  }

  if (fs.existsSync(coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const { total } = coverage;

    report += `**Coverage:**\n`;
    report += `- Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})\n`;
    report += `- Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})\n`;
    report += `- Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})\n`;
    report += `- Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})\n`;
  }

  const summaryFile = path.join(reportDir, `summary-${testType}.md`);
  fs.writeFileSync(summaryFile, report);
  console.log(`✅ Test summary generated: ${summaryFile}`);
}

generateSummary();
