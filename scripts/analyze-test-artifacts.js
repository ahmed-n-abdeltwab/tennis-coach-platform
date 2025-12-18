#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Test Artifacts Analyzer
 *
 * Analyzes test-reports and coverage folders to generate a complete JSON report
 * containing all test results, coverage metrics, and metadata.
 *
 * Usage: node analyze-test-artifacts.js [output-file]
 * Default output: test-reports/analysis.json
 */

const OUTPUT_FILE = process.argv[2] || path.join(__dirname, '..', 'test-reports', 'analysis.json');
const TEST_REPORTS_DIR = path.join(__dirname, '..', 'test-reports');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');

/**
 * Parse JUnit XML to extract test statistics
 */
function parseJUnitXML(xmlContent) {
  const testsuiteMatch = xmlContent.match(/<testsuite[^>]*>/);
  if (!testsuiteMatch) return null;

  const attrs = testsuiteMatch[0];
  const tests = (attrs.match(/tests="(\d+)"/) || [])[1] || '0';
  const failures = (attrs.match(/failures="(\d+)"/) || [])[1] || '0';
  const errors = (attrs.match(/errors="(\d+)"/) || [])[1] || '0';
  const skipped = (attrs.match(/skipped="(\d+)"/) || [])[1] || '0';
  const time = (attrs.match(/time="([\d.]+)"/) || [])[1] || '0';

  // Extract failed test cases
  const failedTests = [];
  const testcaseMatches = xmlContent.matchAll(
    /<testcase[^>]*name="([^"]*)"[^>]*classname="([^"]*)"[^>]*>[\s\S]*?<(failure|error)[^>]*message="([^"]*)"[^>]*>/g
  );

  for (const match of testcaseMatches) {
    failedTests.push({
      name: match[1],
      classname: match[2],
      type: match[3],
      message: match[4],
    });
  }

  return {
    tests: parseInt(tests),
    failures: parseInt(failures),
    errors: parseInt(errors),
    skipped: parseInt(skipped),
    passed: parseInt(tests) - parseInt(failures) - parseInt(errors) - parseInt(skipped),
    time: parseFloat(time),
    failedTests,
  };
}

/**
 * Find the most recent test report JSON file for a given test type
 */
function findLatestTestReport(testType) {
  if (!fs.existsSync(TEST_REPORTS_DIR)) return null;

  const files = fs
    .readdirSync(TEST_REPORTS_DIR)
    .filter(f => f.startsWith(`test-report-${testType}-`) && f.endsWith('.json'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(TEST_REPORTS_DIR, files[0]) : null;
}

/**
 * Analyze a single test type (unit, integration, e2e)
 */
function analyzeTestType(testType) {
  const result = {
    testType,
    hasData: false,
    junit: null,
    coverage: null,
    detailedReport: null,
    timestamp: new Date().toISOString(),
  };

  // 1. Parse JUnit XML
  const junitFile = path.join(TEST_REPORTS_DIR, `junit-${testType}.xml`);
  if (fs.existsSync(junitFile)) {
    try {
      const xmlContent = fs.readFileSync(junitFile, 'utf8');
      result.junit = parseJUnitXML(xmlContent);
      result.hasData = true;
    } catch (error) {
      console.error(`Error parsing JUnit XML for ${testType}:`, error.message);
    }
  }

  // 2. Parse coverage summary
  const coverageFile = path.join(COVERAGE_DIR, 'apps', 'api', testType, 'coverage-summary.json');
  if (fs.existsSync(coverageFile)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      result.coverage = coverage.total;
      result.hasData = true;
    } catch (error) {
      console.error(`Error parsing coverage for ${testType}:`, error.message);
    }
  }

  // 3. Parse detailed test report (Jest JSON reporter)
  const reportFile = findLatestTestReport(testType);
  if (reportFile && fs.existsSync(reportFile)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      result.detailedReport = {
        timestamp: report.timestamp,
        summary: report.summary,
        testFiles: report.details?.length || 0,
        details: report.details || [],
      };
      result.hasData = true;
    } catch (error) {
      console.error(`Error parsing detailed report for ${testType}:`, error.message);
    }
  }

  return result;
}

/**
 * Calculate aggregate statistics across all test types
 */
function calculateAggregates(testResults) {
  const aggregate = {
    total: {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: 0,
      duration: 0,
    },
    coverage: {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    },
    byType: {},
  };

  let coverageCount = 0;

  for (const result of testResults) {
    // Aggregate test counts
    if (result.junit) {
      aggregate.total.tests += result.junit.tests;
      aggregate.total.passed += result.junit.passed;
      aggregate.total.failed += result.junit.failures;
      aggregate.total.errors += result.junit.errors;
      aggregate.total.skipped += result.junit.skipped;
      aggregate.total.duration += result.junit.time;
    }

    // Aggregate coverage (we'll average percentages)
    if (result.coverage) {
      coverageCount++;
      ['lines', 'statements', 'functions', 'branches'].forEach(metric => {
        aggregate.coverage[metric].total += result.coverage[metric].total;
        aggregate.coverage[metric].covered += result.coverage[metric].covered;
      });
    }

    // Store per-type summary
    aggregate.byType[result.testType] = {
      hasData: result.hasData,
      tests: result.junit?.tests || 0,
      passed: result.junit?.passed || 0,
      failed: result.junit?.failures || 0,
      coverage: result.coverage?.lines?.pct || 0,
    };
  }

  // Calculate coverage percentages
  ['lines', 'statements', 'functions', 'branches'].forEach(metric => {
    const { total, covered } = aggregate.coverage[metric];
    aggregate.coverage[metric].pct =
      total > 0 ? parseFloat(((covered / total) * 100).toFixed(2)) : 0;
  });

  // Calculate pass rate
  aggregate.total.passRate =
    aggregate.total.tests > 0
      ? parseFloat(((aggregate.total.passed / aggregate.total.tests) * 100).toFixed(2))
      : 0;

  return aggregate;
}

/**
 * Generate quality badges based on coverage thresholds
 */
function generateQualityBadges(coverage, thresholds = { excellent: 80, good: 60 }) {
  const badges = {};

  ['lines', 'statements', 'functions', 'branches'].forEach(metric => {
    const pct = coverage[metric]?.pct || 0;

    if (pct >= thresholds.excellent) {
      badges[metric] = { emoji: '🟢', label: 'Excellent', color: 'green' };
    } else if (pct >= thresholds.good) {
      badges[metric] = { emoji: '🟡', label: 'Good', color: 'yellow' };
    } else {
      badges[metric] = { emoji: '🔴', label: 'Needs Work', color: 'red' };
    }
  });

  return badges;
}

/**
 * Main analysis function
 */
function analyzeTestArtifacts() {
  console.log('🔍 Analyzing test artifacts...\n');

  const testTypes = ['unit', 'integration', 'e2e'];
  const testResults = testTypes.map(analyzeTestType);

  // Calculate aggregates
  const aggregate = calculateAggregates(testResults);

  // Generate quality badges
  const qualityBadges = generateQualityBadges(aggregate.coverage);

  // Build final report
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      testReportsDir: TEST_REPORTS_DIR,
      coverageDir: COVERAGE_DIR,
      version: '1.0.0',
    },
    summary: {
      aggregate,
      qualityBadges,
      status: aggregate.total.failed === 0 && aggregate.total.errors === 0 ? 'passed' : 'failed',
    },
    testTypes: {},
  };

  // Add detailed results for each test type
  testResults.forEach(result => {
    report.testTypes[result.testType] = result;
  });

  // Write report
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // Print summary
  console.log('📊 Analysis Summary:');
  console.log('─'.repeat(50));
  console.log(`Total Tests:     ${aggregate.total.tests}`);
  console.log(`✅ Passed:       ${aggregate.total.passed}`);
  console.log(`❌ Failed:       ${aggregate.total.failed}`);
  console.log(`⏭️  Skipped:      ${aggregate.total.skipped}`);
  console.log(`Pass Rate:       ${aggregate.total.passRate}%`);
  console.log(`Duration:        ${aggregate.total.duration.toFixed(2)}s`);
  console.log('');
  console.log('Coverage:');
  console.log(`  Lines:         ${aggregate.coverage.lines.pct}% ${qualityBadges.lines.emoji}`);
  console.log(
    `  Statements:    ${aggregate.coverage.statements.pct}% ${qualityBadges.statements.emoji}`
  );
  console.log(
    `  Functions:     ${aggregate.coverage.functions.pct}% ${qualityBadges.functions.emoji}`
  );
  console.log(
    `  Branches:      ${aggregate.coverage.branches.pct}% ${qualityBadges.branches.emoji}`
  );
  console.log('');
  console.log(`✅ Report generated: ${OUTPUT_FILE}`);

  return report;
}

// Run analysis
try {
  const report = analyzeTestArtifacts();
  process.exit(report.summary.status === 'passed' ? 0 : 1);
} catch (error) {
  console.error('❌ Error analyzing test artifacts:', error);
  process.exit(1);
}
