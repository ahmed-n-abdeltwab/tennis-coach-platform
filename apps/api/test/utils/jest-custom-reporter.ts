import { Reporter, ReporterOnStartOptions, Test, TestResult } from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';
import { Config } from '@jest/types';

import TestReporter, { TestResults } from './test-reporter';

export default class JestCustomReporter implements Reporter {
  private testReporter: TestReporter;
  private startTime = 0;

  constructor(
    private globalConfig: Config.GlobalConfig,
    private options: any = {}
  ) {
    this.testReporter = TestReporter.getInstance();
  }

  onRunStart(results: AggregatedResult, options: ReporterOnStartOptions): void {
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
      console.log(`❌ Failed: ${test.path}`);
      testResult.failureMessage && console.log(testResult.failureMessage);
    } else if (this.options.verbose) {
      console.log(`✅ Passed: ${test.path}`);
    }
  }

  onRunComplete(contexts: Set<any>, results: AggregatedResult): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Determine test type from config
    const testType = this.determineTestType();

    const testResults: TestResults = {
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
        failureMessage: result.failureMessage || undefined,
      })),
      coverageMap: results.coverageMap,
      startTime: this.startTime,
      endTime,
      duration,
    };

    // Generate comprehensive report
    this.testReporter.generateReport(testResults);

    // Display quick summary
    this.displayQuickSummary(testResults);
  }

  private determineTestType(): 'unit' | 'integration' | 'e2e' | 'all' {
    const configPath = this.globalConfig.testPathPatterns?.[0] || '';

    if (configPath.includes('integration')) return 'integration';
    if (configPath.includes('e2e')) return 'e2e';
    if (configPath.includes('all')) return 'all';
    return 'unit';
  }

  private displayQuickSummary(results: TestResults): void {
    const passRate =
      results.numTotalTests > 0
        ? ((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)
        : '0';

    console.log(`\n${  '─'.repeat(50)}`);
    console.log(`🎯 Quick Summary (${results.testType.toUpperCase()})`);
    console.log('─'.repeat(50));
    console.log(`Tests: ${results.numPassedTests}/${results.numTotalTests} passed (${passRate}%)`);
    console.log(`Time: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Status: ${results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('─'.repeat(50));
  }

  getLastError(): Error | undefined {
    return undefined;
  }
}
