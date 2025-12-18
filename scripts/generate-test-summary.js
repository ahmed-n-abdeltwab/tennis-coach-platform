#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

/**
 * Generate a comprehensive test summary from JUnit XML and coverage data
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

async function generateSummary() {
  const reportDir = path.join(__dirname, '..', 'test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  let report = `## 📋 ${testType.charAt(0).toUpperCase() + testType.slice(1)} Test Summary\n\n`;

  // Parse JUnit XML for test statistics
  if (fs.existsSync(junitFile)) {
    try {
      const xmlData = fs.readFileSync(junitFile, 'utf8');
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);

      const testsuites = result.testsuites || result.testsuite;
      let totalTests = 0;
      let failures = 0;
      let errors = 0;
      let skipped = 0;
      let time = 0;

      if (testsuites) {
        const suites = Array.isArray(testsuites) ? testsuites : [testsuites];
        suites.forEach(suite => {
          const attrs = suite.$ || suite;
          totalTests += parseInt(attrs.tests || 0);
          failures += parseInt(attrs.failures || 0);
          errors += parseInt(attrs.errors || 0);
          skipped += parseInt(attrs.skipped || 0);
          time += parseFloat(attrs.time || 0);
        });
      }

      const passed = totalTests - failures - errors - skipped;
      const passRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : 0;

      report += `### Test Results\n\n`;
      report += `| Metric | Count |\n`;
      report += `|--------|-------|\n`;
      report += `| Total Tests | ${totalTests} |\n`;
      report += `| ✅ Passed | ${passed} |\n`;
      report += `| ❌ Failed | ${failures + errors} |\n`;
      report += `| ⏭️ Skipped | ${skipped} |\n`;
      report += `| Pass Rate | ${passRate}% |\n`;
      report += `| ⏱️ Duration | ${time.toFixed(2)}s |\n\n`;

      // List failed tests if any
      if (failures + errors > 0) {
        report += `### ❌ Failed Tests\n\n`;
        const suites = Array.isArray(testsuites) ? testsuites : [testsuites];
        suites.forEach(suite => {
          const testcases = suite.testcase || [];
          testcases.forEach(testcase => {
            const failure = testcase.failure || testcase.error;
            if (failure && failure.length > 0) {
              const name = testcase.$.name || 'Unknown';
              const classname = testcase.$.classname || '';
              report += `- **${classname}** → ${name}\n`;
            }
          });
        });
        report += `\n`;
      }
    } catch (error) {
      report += `⚠️ Could not parse test results: ${error.message}\n\n`;
    }
  } else {
    report += `⚠️ No test results found\n\n`;
  }

  // Add coverage data if available
  if (fs.existsSync(coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    const { total } = coverage;

    report += `### Coverage Summary\n\n`;
    report += `| Metric | Coverage |\n`;
    report += `|--------|----------|\n`;
    report += `| Lines | ${total.lines.pct}% (${total.lines.covered}/${total.lines.total}) |\n`;
    report += `| Statements | ${total.statements.pct}% (${total.statements.covered}/${total.statements.total}) |\n`;
    report += `| Functions | ${total.functions.pct}% (${total.functions.covered}/${total.functions.total}) |\n`;
    report += `| Branches | ${total.branches.pct}% (${total.branches.covered}/${total.branches.total}) |\n\n`;
  }

  // Write summary
  const summaryFile = path.join(reportDir, `summary-${testType}.md`);
  fs.writeFileSync(summaryFile, report);
  console.log(`✅ Test summary generated: ${summaryFile}`);
}

generateSummary().catch(error => {
  console.error('Error generating summary:', error);
  process.exit(1);
});
