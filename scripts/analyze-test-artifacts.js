#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = process.argv[2] || path.join(__dirname, '..', 'test-reports', 'analysis.json');
const TEST_REPORTS_DIR = path.join(__dirname, '..', 'test-reports');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');

const TEST_TYPES = ['unit', 'integration', 'e2e'];
const COVERAGE_METRICS = ['lines', 'statements', 'functions', 'branches'];
const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
};
const REPORT_VERSION = '1.0.0';

function extractAttribute(attrs, name, defaultValue = '0') {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? match[1] : defaultValue;
}

function parseJUnitXML(xmlContent) {
  const testsuiteMatch = xmlContent.match(/<testsuite[^>]*>/);
  if (!testsuiteMatch) {
    return null;
  }

  const attrs = testsuiteMatch[0];
  const tests = parseInt(extractAttribute(attrs, 'tests'), 10);
  const failures = parseInt(extractAttribute(attrs, 'failures'), 10);
  const errors = parseInt(extractAttribute(attrs, 'errors'), 10);
  const skipped = parseInt(extractAttribute(attrs, 'skipped'), 10);
  const time = parseFloat(extractAttribute(attrs, 'time'));

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
    tests,
    failures,
    errors,
    skipped,
    passed: tests - failures - errors - skipped,
    time,
    failedTests,
  };
}

function findLatestTestReport(testType) {
  if (!fs.existsSync(TEST_REPORTS_DIR)) {
    return null;
  }

  const prefix = `test-report-${testType}-`;
  const files = fs
    .readdirSync(TEST_REPORTS_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log(`  No detailed ${testType} reports found`);
    return null;
  }

  console.log(`  Found ${files.length} ${testType} report(s), using latest: ${files[0]}`);
  return path.join(TEST_REPORTS_DIR, files[0]);
}

function parseJUnitFile(junitFile) {
  console.log(`  Checking JUnit XML: ${junitFile}`);
  if (!fs.existsSync(junitFile)) {
    return null;
  }

  try {
    const xmlContent = fs.readFileSync(junitFile, 'utf8');
    const parsed = parseJUnitXML(xmlContent);
    if (parsed) {
      console.log(`  ✅ JUnit XML parsed: ${parsed.tests} tests`);
    }
    return parsed;
  } catch (error) {
    console.error(`  ❌ Error parsing JUnit XML:`, error.message);
    return null;
  }
}

function parseCoverageFile(testType) {
  const coverageFile = path.join(COVERAGE_DIR, 'apps', 'api', testType, 'coverage-summary.json');
  console.log(`  Checking coverage: ${coverageFile}`);

  if (!fs.existsSync(coverageFile)) {
    console.log(`  ⚠️  Coverage file not found`);
    return null;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    console.log(`  ✅ Coverage parsed: ${coverage.total.lines.pct}% lines`);
    return coverage.total;
  } catch (error) {
    console.error(`  ❌ Error parsing coverage for ${testType}:`, error.message);
    return null;
  }
}

function parseDetailedReport(testType) {
  const reportFile = findLatestTestReport(testType);
  if (!reportFile || !fs.existsSync(reportFile)) {
    return null;
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const detailedReport = {
      timestamp: report.timestamp,
      summary: report.summary,
      testFiles: report.details?.length || 0,
      details: report.details || [],
    };
    console.log(`  ✅ Detailed report parsed: ${detailedReport.testFiles} test files`);
    return detailedReport;
  } catch (error) {
    console.error(`  ❌ Error parsing detailed report for ${testType}:`, error.message);
    return null;
  }
}

function analyzeTestType(testType) {
  console.log(`\nAnalyzing ${testType} tests...`);

  const result = {
    testType,
    hasData: false,
    junit: null,
    coverage: null,
    detailedReport: null,
    timestamp: new Date().toISOString(),
    sources: {
      junit: false,
      coverage: false,
      detailedReport: false,
    },
  };

  const junitFiles = [
    path.join(TEST_REPORTS_DIR, `junit-${testType}.xml`),
    path.join(TEST_REPORTS_DIR, 'junit.xml'),
  ];

  for (const junitFile of junitFiles) {
    const parsed = parseJUnitFile(junitFile);
    if (parsed) {
      result.junit = parsed;
      result.hasData = true;
      result.sources.junit = true;
      break;
    }
  }

  if (!result.sources.junit) {
    console.log(`  ⚠️  JUnit XML not found`);
  }

  const coverage = parseCoverageFile(testType);
  if (coverage) {
    result.coverage = coverage;
    result.hasData = true;
    result.sources.coverage = true;
  }

  const detailedReport = parseDetailedReport(testType);
  if (detailedReport) {
    result.detailedReport = detailedReport;
    result.hasData = true;
    result.sources.detailedReport = true;
  }

  const sourcesFound = Object.values(result.sources).filter(Boolean).length;
  const totalSources = Object.keys(result.sources).length;
  console.log(`  📊 Data sources found: ${sourcesFound}/${totalSources}`);

  if (!result.hasData) {
    console.log(`  ⚠️  No data found for ${testType} tests`);
  }

  return result;
}

function calculatePercentage(numerator, denominator) {
  if (denominator === 0) {
    return 0;
  }
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
}

function initializeCoverageMetric() {
  return { total: 0, covered: 0, pct: 0 };
}

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
    coverage: {},
    byType: {},
  };

  COVERAGE_METRICS.forEach(metric => {
    aggregate.coverage[metric] = initializeCoverageMetric();
  });

  for (const result of testResults) {
    if (result.junit) {
      aggregate.total.tests += result.junit.tests;
      aggregate.total.passed += result.junit.passed;
      aggregate.total.failed += result.junit.failures;
      aggregate.total.errors += result.junit.errors;
      aggregate.total.skipped += result.junit.skipped;
      aggregate.total.duration += result.junit.time;
    }

    if (result.coverage) {
      COVERAGE_METRICS.forEach(metric => {
        aggregate.coverage[metric].total += result.coverage[metric].total;
        aggregate.coverage[metric].covered += result.coverage[metric].covered;
      });
    }

    aggregate.byType[result.testType] = {
      hasData: result.hasData,
      tests: result.junit?.tests || 0,
      passed: result.junit?.passed || 0,
      failed: result.junit?.failures || 0,
      coverage: result.coverage?.lines?.pct || 0,
    };
  }

  COVERAGE_METRICS.forEach(metric => {
    const { total, covered } = aggregate.coverage[metric];
    aggregate.coverage[metric].pct = calculatePercentage(covered, total);
  });

  aggregate.total.passRate = calculatePercentage(aggregate.total.passed, aggregate.total.tests);

  return aggregate;
}

function getQualityBadge(pct) {
  if (pct >= QUALITY_THRESHOLDS.excellent) {
    return { emoji: '🟢', label: 'Excellent', color: 'green' };
  } else if (pct >= QUALITY_THRESHOLDS.good) {
    return { emoji: '🟡', label: 'Good', color: 'yellow' };
  } else {
    return { emoji: '🔴', label: 'Needs Work', color: 'red' };
  }
}

function generateQualityBadges(coverage) {
  const badges = {};

  COVERAGE_METRICS.forEach(metric => {
    const pct = coverage[metric]?.pct || 0;
    badges[metric] = getQualityBadge(pct);
  });

  return badges;
}

function determineStatus(aggregate) {
  if (aggregate.total.failed === 0 && aggregate.total.errors === 0) {
    return 'passed';
  }
  return 'failed';
}

function printSummary(aggregate, qualityBadges) {
  const SEPARATOR_LENGTH = 50;
  const DECIMAL_PLACES = 2;

  console.log('📊 Analysis Summary:');
  console.log('─'.repeat(SEPARATOR_LENGTH));
  console.log(`Total Tests:     ${aggregate.total.tests}`);
  console.log(`✅ Passed:       ${aggregate.total.passed}`);
  console.log(`❌ Failed:       ${aggregate.total.failed}`);
  console.log(`⏭️  Skipped:      ${aggregate.total.skipped}`);
  console.log(`Pass Rate:       ${aggregate.total.passRate}%`);
  console.log(`Duration:        ${aggregate.total.duration.toFixed(DECIMAL_PLACES)}s`);
  console.log('');
  console.log('Coverage:');

  COVERAGE_METRICS.forEach(metric => {
    const label = metric.charAt(0).toUpperCase() + metric.slice(1);
    const padding = ' '.repeat(15 - label.length);
    console.log(
      `  ${label}:${padding}${aggregate.coverage[metric].pct}% ${qualityBadges[metric].emoji}`
    );
  });

  console.log('');
  console.log(`✅ Report generated: ${OUTPUT_FILE}`);
}

function analyzeTestArtifacts() {
  console.log('🔍 Analyzing test artifacts...\n');

  const testResults = TEST_TYPES.map(analyzeTestType);
  const aggregate = calculateAggregates(testResults);
  const qualityBadges = generateQualityBadges(aggregate.coverage);

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      testReportsDir: TEST_REPORTS_DIR,
      coverageDir: COVERAGE_DIR,
      version: REPORT_VERSION,
    },
    summary: {
      aggregate,
      qualityBadges,
      status: determineStatus(aggregate),
    },
    testTypes: {},
  };

  testResults.forEach(result => {
    report.testTypes[result.testType] = result;
  });

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  printSummary(aggregate, qualityBadges);

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
