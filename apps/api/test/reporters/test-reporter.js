'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TestReporter = void 0;
/* eslint-disable no-console */
const fs_1 = require('fs');
const path_1 = require('path');
class TestReporter {
  constructor() {
    this.reportsDir = (0, path_1.join)(process.cwd(), 'test-reports');
    this.ensureReportsDirectory();
  }
  static getInstance() {
    if (!TestReporter.instance) {
      TestReporter.instance = new TestReporter();
    }
    return TestReporter.instance;
  }
  ensureReportsDirectory() {
    if (!(0, fs_1.existsSync)(this.reportsDir)) {
      (0, fs_1.mkdirSync)(this.reportsDir, { recursive: true });
    }
  }
  /**
   * Generate a comprehensive test report
   */
  generateReport(results) {
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      testType: results.testType,
      summary: {
        success: results.success,
        total: results.numTotalTests,
        passed: results.numPassedTests,
        failed: results.numFailedTests,
        pending: results.numPendingTests,
        duration: results.duration,
      },
      details: results.testResults,
      coverage: this.extractCoverageData(results.coverageMap),
    };
    // Generate JSON report
    this.generateJsonReport(reportData);
    // Generate HTML report
    this.generateHtmlReport(reportData);
    // Generate console summary
    this.generateConsoleSummary(reportData);
    // Send notifications if configured
    this.sendNotifications(reportData);
  }
  generateJsonReport(reportData) {
    const filename = `test-report-${reportData.testType}-${Date.now()}.json`;
    const filepath = (0, path_1.join)(this.reportsDir, filename);
    (0, fs_1.writeFileSync)(filepath, JSON.stringify(reportData, null, 2));
    console.log(`📊 JSON report generated: ${filepath}`);
  }
  generateHtmlReport(reportData) {
    const html = this.createHtmlReport(reportData);
    const filename = `test-report-${reportData.testType}-${Date.now()}.html`;
    const filepath = (0, path_1.join)(this.reportsDir, filename);
    (0, fs_1.writeFileSync)(filepath, html);
    console.log(`📊 HTML report generated: ${filepath}`);
  }
  createHtmlReport(reportData) {
    const summary = reportData.summary;
    const statusColor = summary.success ? '#28a745' : '#dc3545';
    const statusIcon = summary.success ? '✅' : '❌';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${reportData.testType}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #495057; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .coverage { margin: 20px 0; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .test-files { margin-top: 30px; }
        .test-file { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .failed { border-left-color: #dc3545; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusIcon} Test Report - ${reportData.testType.toUpperCase()}</h1>
            <p class="timestamp">Generated: ${reportData.timestamp}</p>
        </div>
        <div class="content">
            <div class="summary">
                <div class="metric">
                    <div class="metric-value">${summary.total ?? 0}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="metric-value" style="color: #28a745">${summary.passed ?? 0}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value" style="color: #dc3545">${summary.failed ?? 0}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value" style="color: #ffc107">${summary.pending ?? 0}</div>
                    <div class="metric-label">Pending</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${((summary.duration ?? 0) / 1000).toFixed(2)}s</div>
                    <div class="metric-label">Duration</div>
                </div>
            </div>

            ${reportData.coverage ? this.generateCoverageHtml(reportData.coverage) : ''}

            <div class="test-files">
                <h3>Test Files</h3>
                ${reportData.details
                  .map(
                    file => `
                    <div class="test-file ${file.numFailingTests > 0 ? 'failed' : ''}">
                        <h4>${file.testFilePath}</h4>
                        <p>Passed: ${file.numPassingTests}, Failed: ${file.numFailingTests}, Pending: ${file.numPendingTests}</p>
                        ${file.failureMessage ? `<pre style="background: #f8d7da; padding: 10px; border-radius: 4px; overflow-x: auto;">${file.failureMessage}</pre>` : ''}
                    </div>
                `
                  )
                  .join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
  }
  generateCoverageHtml(coverage) {
    return `
      <div class="coverage">
        <h3>Coverage Report</h3>
        <div>
          <strong>Lines:</strong> ${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.pct.toFixed(1)}%)
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.lines.pct}%"></div>
          </div>
        </div>
        <div>
          <strong>Functions:</strong> ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.pct.toFixed(1)}%)
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.functions.pct}%"></div>
          </div>
        </div>
        <div>
          <strong>Statements:</strong> ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.pct.toFixed(1)}%)
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.statements.pct}%"></div>
          </div>
        </div>
        <div>
          <strong>Branches:</strong> ${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.pct.toFixed(1)}%)
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${coverage.branches.pct}%"></div>
          </div>
        </div>
      </div>
    `;
  }
  getTerminalWidth() {
    // Priority: stdout.columns (TTY) > COLUMNS env var > default 120
    const envColumns = parseInt(process.env.COLUMNS ?? '', 10);
    return process.stdout.columns ?? (isNaN(envColumns) ? 120 : envColumns);
  }
  generateConsoleSummary(reportData) {
    const statusIcon = reportData.summary.success ? '✅' : '❌';
    const duration = (reportData.summary.duration / 1000).toFixed(2);
    const width = this.getTerminalWidth();
    console.log(`\n${'='.repeat(width)}`);
    console.log(`${statusIcon} TEST SUMMARY - ${reportData.testType.toUpperCase()}`);
    console.log('='.repeat(width));
    console.log(`📊 Total Tests: ${reportData.summary.total}`);
    console.log(`✅ Passed: ${reportData.summary.passed}`);
    console.log(`❌ Failed: ${reportData.summary.failed}`);
    console.log(`⏳ Pending: ${reportData.summary.pending}`);
    console.log(`⏱️  Duration: ${duration}s`);
    if (reportData.coverage) {
      console.log('\n📈 COVERAGE SUMMARY');
      console.log('-'.repeat(Math.min(30, width)));
      console.log(`Lines: ${reportData.coverage.lines.pct.toFixed(1)}%`);
      console.log(`Functions: ${reportData.coverage.functions.pct.toFixed(1)}%`);
      console.log(`Statements: ${reportData.coverage.statements.pct.toFixed(1)}%`);
      console.log(`Branches: ${reportData.coverage.branches.pct.toFixed(1)}%`);
    }
    console.log(`${'='.repeat(width)}\n`);
  }
  extractCoverageData(coverageMap) {
    if (!coverageMap) return null;
    // Extract coverage data from Jest coverage map
    let totalLines = 0,
      coveredLines = 0;
    let totalFunctions = 0,
      coveredFunctions = 0;
    let totalStatements = 0,
      coveredStatements = 0;
    let totalBranches = 0,
      coveredBranches = 0;
    Object.values(coverageMap).forEach(fileCoverage => {
      if (fileCoverage.lines) {
        totalLines += Object.keys(fileCoverage.lines).length;
        coveredLines += Object.values(fileCoverage.lines).filter(
          count => typeof count === 'number' && count > 0
        ).length;
      }
      if (fileCoverage.functions) {
        totalFunctions += Object.keys(fileCoverage.functions).length;
        coveredFunctions += Object.values(fileCoverage.functions).filter(
          count => typeof count === 'number' && count > 0
        ).length;
      }
      if (fileCoverage.statements) {
        totalStatements += Object.keys(fileCoverage.statements).length;
        coveredStatements += Object.values(fileCoverage.statements).filter(
          count => typeof count === 'number' && count > 0
        ).length;
      }
      if (fileCoverage.branches) {
        totalBranches += Object.keys(fileCoverage.branches).length;
        coveredBranches += Object.values(fileCoverage.branches).filter(
          count => typeof count === 'number' && count > 0
        ).length;
      }
    });
    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        pct: totalLines ? (coveredLines / totalLines) * 100 : 0,
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        pct: totalFunctions ? (coveredFunctions / totalFunctions) * 100 : 0,
      },
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        pct: totalStatements ? (coveredStatements / totalStatements) * 100 : 0,
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        pct: totalBranches ? (coveredBranches / totalBranches) * 100 : 0,
      },
    };
  }
  sendNotifications(reportData) {
    // Check for notification configuration
    const notificationConfig = process.env.TEST_NOTIFICATIONS;
    if (notificationConfig === 'slack') {
      this.sendSlackNotification(reportData);
    } else if (notificationConfig === 'email') {
      this.sendEmailNotification(reportData);
    } else if (notificationConfig === 'webhook') {
      this.sendWebhookNotification(reportData);
    }
  }
  sendSlackNotification(reportData) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;
    const statusIcon = reportData.summary.success ? ':white_check_mark:' : ':x:';
    const color = reportData.summary.success ? 'good' : 'danger';
    const payload = {
      attachments: [
        {
          color,
          title: `${statusIcon} Test Results - ${reportData.testType.toUpperCase()}`,
          fields: [
            { title: 'Total Tests', value: reportData.summary.total, short: true },
            { title: 'Passed', value: reportData.summary.passed, short: true },
            { title: 'Failed', value: reportData.summary.failed, short: true },
            {
              title: 'Duration',
              value: `${(reportData.summary.duration / 1000).toFixed(2)}s`,
              short: true,
            },
          ],
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };
    // In a real implementation, you would use axios or fetch to send this
    console.log('📱 Slack notification payload:', JSON.stringify(payload, null, 2));
  }
  sendEmailNotification(_reportData) {
    // Email notification implementation would go here
    console.log('📧 Email notification would be sent with test results');
  }
  sendWebhookNotification(_reportData) {
    const webhookUrl = process.env.TEST_WEBHOOK_URL;
    if (!webhookUrl) return;
    // Webhook notification implementation would go here
    console.log('🔗 Webhook notification would be sent to:', webhookUrl);
  }
}
exports.TestReporter = TestReporter;
exports.default = TestReporter;
