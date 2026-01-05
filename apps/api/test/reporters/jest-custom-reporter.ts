import { Reporter, ReporterOnStartOptions, Test, TestResult } from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';
import { Config } from '@jest/types';

import TestReporter, { TestResults } from './test-reporter';

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
export default class JestCustomReporter implements Reporter {
  private testReporter: TestReporter;
  private startTime = 0;
  private options: { verbose?: boolean };

  constructor(
    private globalConfig: Config.GlobalConfig,
    options: { verbose?: boolean } = {}
  ) {
    this.options = options;
    this.testReporter = TestReporter.getInstance();
  }

  onRunStart(_results: AggregatedResult, _options: ReporterOnStartOptions): void {
    this.startTime = Date.now();
    console.log('🚀 Starting test execution...');
  }

  onTestStart(test: Test): void {
    if (this.options.verbose) {
      console.log(`▶️  Running: ${test.path}`);
    }
  }

  onTestResult(test: Test, testResult: TestResult): void {
    if (testResult.numFailingTests > 0) {
      console.error(`❌ Failed: ${test.path}`);
      if (testResult.failureMessage) {
        console.error(testResult.failureMessage);
      }
    } else if (this.options.verbose) {
      console.log(`✅ Passed: ${test.path}`);
    }
  }

  onRunComplete(_contexts: Set<unknown>, results: AggregatedResult): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const testType = this.determineTestType();

    // Calculate success based on actual test results, not Jest's success flag
    // Jest's success can be false due to snapshot failures or other non-test issues
    const isSuccess = results.numFailedTests === 0 && results.numFailedTestSuites === 0;

    const testResults: TestResults = {
      testType,
      success: isSuccess,
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

  private determineTestType(): 'unit' | 'integration' | 'e2e' | 'all' {
    // Check NX_TASK_TARGET_TARGET which Nx sets when running tasks
    const nxTarget = process.env.NX_TASK_TARGET_TARGET ?? '';
    if (nxTarget.includes('e2e')) return 'e2e';
    if (nxTarget.includes('integration')) return 'integration';

    // Fallback to config path check
    const configPath = this.globalConfig.rootDir ?? '';
    if (configPath.includes('integration')) return 'integration';
    if (configPath.includes('e2e')) return 'e2e';
    if (configPath.includes('all')) return 'all';

    // Check command line arguments
    const args = process.argv.join(' ');
    if (args.includes('integration')) return 'integration';
    if (args.includes('e2e')) return 'e2e';

    return 'unit';
  }

  private getTerminalWidth(): number {
    // Priority: stdout.columns (TTY) > COLUMNS env var > default 120
    const envColumns = parseInt(process.env.COLUMNS ?? '', 10);
    return process.stdout.columns ?? (isNaN(envColumns) ? 120 : envColumns);
  }

  private displayQuickSummary(results: TestResults): void {
    const passRate =
      results.numTotalTests > 0
        ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)
        : '0';

    const width = this.getTerminalWidth();

    console.log(`\n${'─'.repeat(width)}`);
    console.log(`🎯 Quick Summary (${results.testType.toUpperCase()})`);
    console.log('─'.repeat(width));
    console.log(`Tests: ${results.numPassedTests}/${results.numTotalTests} passed (${passRate}%)`);
    console.log(`Time: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('─'.repeat(width));
  }

  getLastError(): Error | undefined {
    return undefined;
  }
}
