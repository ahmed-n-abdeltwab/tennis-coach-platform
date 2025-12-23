'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const test_reporter_1 = __importDefault(require('./test-reporter'));
/**
 * Custom Jest Reporter
 *
 * Provides enhanced test reporting with:
 * - JSON and HTML report generation
 * - Coverage summaries
 * - Console output with emojis
 * - Optional Slack/webhook notifications
 *
 * Usage in jest.config.ts:
 * ```
 * reporters: [
 *   'default',
 *   ['<rootDir>/test/reporters/jest-custom-reporter.js', { verbose: false }],
 * ],
 * ```
 */
class JestCustomReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.startTime = 0;
    this.options = options;
    this.testReporter = test_reporter_1.default.getInstance();
  }
  onRunStart(_results, _options) {
    this.startTime = Date.now();
    console.log('🚀 Starting test execution...');
  }
  onTestStart(test) {
    if (this.options.verbose) {
      console.log(`▶️  Running: ${test.path}`);
    }
  }
  onTestResult(test, testResult) {
    if (testResult.numFailingTests > 0) {
      console.error(`❌ Failed: ${test.path}`);
      if (testResult.failureMessage) {
        console.error(testResult.failureMessage);
      }
    } else if (this.options.verbose) {
      console.log(`✅ Passed: ${test.path}`);
    }
  }
  onRunComplete(_contexts, results) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    const testType = this.determineTestType();
    const testResults = {
      testType,
      success: results.numFailedTests === 0 && results.numRuntimeErrorTestSuites === 0,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      testResults: results.testResults.map(result => ({
        testFilePath: result.testFilePath,
        numFailingTests: result.numFailingTests,
        numPassingTests: result.numPassingTests,
        numPendingTests: result.numPendingTests,
        failureMessage: result.failureMessage ?? undefined,
      })),
      coverageMap: results.coverageMap,
      startTime: this.startTime,
      endTime,
      duration,
    };
    this.testReporter.generateReport(testResults);
    this.displayQuickSummary(testResults);
  }
  determineTestType() {
    const configPath = this.globalConfig.rootDir ?? '';
    if (configPath.includes('integration')) return 'integration';
    if (configPath.includes('e2e')) return 'e2e';
    if (configPath.includes('all')) return 'all';
    return 'unit';
  }
  displayQuickSummary(results) {
    const passRate =
      results.numTotalTests > 0
        ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)
        : '0';
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`🎯 Quick Summary (${results.testType.toUpperCase()})`);
    console.log('─'.repeat(50));
    console.log(`Tests: ${results.numPassedTests}/${results.numTotalTests} passed (${passRate}%)`);
    console.log(`Time: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('─'.repeat(50));
  }
  getLastError() {
    return undefined;
  }
}
exports.default = JestCustomReporter;
