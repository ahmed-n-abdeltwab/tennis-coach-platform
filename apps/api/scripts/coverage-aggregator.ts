#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CoverageData {
  [filePath: string]: {
    path: string;
    statementMap: any;
    fnMap: any;
    branchMap: any;
    s: { [key: string]: number };
    f: { [key: string]: number };
    b: { [key: string]: number[] };
  };
}

type CoverageSummary = {
  lines: { total: number; covered: number; skipped: number; pct: number };
  functions: { total: number; covered: number; skipped: number; pct: number };
  statements: { total: number; covered: number; skipped: number; pct: number };
  branches: { total: number; covered: number; skipped: number; pct: number };
};

class CoverageAggregator {
  private readonly coverageDir = join(process.cwd(), '../../coverage/apps/api');
  private readonly outputDir = join(this.coverageDir, 'combined');

  async aggregate(): Promise<void> {
    console.log('📊 Coverage Aggregator');
    console.log('======================');

    // Ensure output directory exists
    this.ensureOutputDirectory();

    // Find all coverage files
    const coverageFiles = await this.findCoverageFiles();

    if (coverageFiles.length === 0) {
      console.log('⚠️  No coverage files found');
      return;
    }

    console.log(`📁 Found ${coverageFiles.length} coverage files`);

    // Aggregate coverage data
    const aggregatedCoverage = await this.aggregateCoverageData(coverageFiles);

    // Generate combined reports
    await this.generateCombinedReports(aggregatedCoverage);

    console.log('✅ Coverage aggregation completed');
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private async findCoverageFiles(): Promise<string[]> {
    const patterns = [
      join(this.coverageDir, 'unit/coverage-final.json'),
      join(this.coverageDir, 'integration/coverage-final.json'),
      join(this.coverageDir, 'e2e/coverage-final.json'),
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      if (existsSync(pattern)) {
        files.push(pattern);
        console.log(`📄 Found: ${pattern}`);
      }
    }

    return files;
  }

  private async aggregateCoverageData(coverageFiles: string[]): Promise<CoverageData> {
    const aggregated: CoverageData = {};

    for (const file of coverageFiles) {
      console.log(`🔄 Processing: ${file}`);

      try {
        const coverageData: CoverageData = JSON.parse(readFileSync(file, 'utf8'));

        for (const [filePath, fileData] of Object.entries(coverageData)) {
          if (!aggregated[filePath]) {
            // First time seeing this file
            aggregated[filePath] = { ...fileData };
          } else {
            // Merge coverage data
            this.mergeCoverageData(aggregated[filePath], fileData);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
      }
    }

    return aggregated;
  }

  private mergeCoverageData(target: any, source: any): void {
    // Merge statement coverage
    for (const [key, value] of Object.entries(source.s)) {
      target.s[key] = (target.s[key] || 0) + (value as number);
    }

    // Merge function coverage
    for (const [key, value] of Object.entries(source.f)) {
      target.f[key] = (target.f[key] || 0) + (value as number);
    }

    // Merge branch coverage
    for (const [key, branches] of Object.entries(source.b)) {
      if (!target.b[key]) {
        target.b[key] = [...(branches as number[])];
      } else {
        const targetBranches = target.b[key];
        const sourceBranches = branches as number[];

        for (let i = 0; i < sourceBranches.length; i++) {
          targetBranches[i] = (targetBranches[i] || 0) + sourceBranches[i];
        }
      }
    }
  }

  private async generateCombinedReports(coverageData: CoverageData): Promise<void> {
    // Generate JSON report
    const jsonPath = join(this.outputDir, 'coverage-final.json');
    writeFileSync(jsonPath, JSON.stringify(coverageData, null, 2));
    console.log(`📄 Generated: ${jsonPath}`);

    // Generate summary report
    const summary = this.calculateSummary(coverageData);
    const summaryPath = join(this.outputDir, 'coverage-summary.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Generated: ${summaryPath}`);

    // Generate HTML report
    await this.generateHtmlReport(coverageData, summary);

    // Generate LCOV report
    await this.generateLcovReport(coverageData);

    // Display summary
    this.displaySummary(summary);
  }

  private calculateSummary(coverageData: CoverageData): {
    total: CoverageSummary;
    [filePath: string]: CoverageSummary;
  } {
    const summary: { total: CoverageSummary; [filePath: string]: CoverageSummary } = {
      total: {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
      },
    };

    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const fileSummary = this.calculateFileSummary(fileData);
      summary[filePath] = fileSummary;

      // Add to totals
      summary.total.lines.total += fileSummary.lines.total;
      summary.total.lines.covered += fileSummary.lines.covered;
      summary.total.functions.total += fileSummary.functions.total;
      summary.total.functions.covered += fileSummary.functions.covered;
      summary.total.statements.total += fileSummary.statements.total;
      summary.total.statements.covered += fileSummary.statements.covered;
      summary.total.branches.total += fileSummary.branches.total;
      summary.total.branches.covered += fileSummary.branches.covered;
    }

    // Calculate percentages
    summary.total.lines.pct = this.calculatePercentage(
      summary.total.lines.covered,
      summary.total.lines.total
    );
    summary.total.functions.pct = this.calculatePercentage(
      summary.total.functions.covered,
      summary.total.functions.total
    );
    summary.total.statements.pct = this.calculatePercentage(
      summary.total.statements.covered,
      summary.total.statements.total
    );
    summary.total.branches.pct = this.calculatePercentage(
      summary.total.branches.covered,
      summary.total.branches.total
    );

    return summary;
  }

  private calculateFileSummary(fileData: any): CoverageSummary {
    const statements = Object.values(fileData.s) as number[];
    const functions = Object.values(fileData.f) as number[];
    const branches = Object.values(fileData.b).flat() as number[];

    return {
      lines: {
        total: statements.length,
        covered: statements.filter(count => count > 0).length,
        skipped: 0,
        pct: this.calculatePercentage(
          statements.filter(count => count > 0).length,
          statements.length
        ),
      },
      functions: {
        total: functions.length,
        covered: functions.filter(count => count > 0).length,
        skipped: 0,
        pct: this.calculatePercentage(
          functions.filter(count => count > 0).length,
          functions.length
        ),
      },
      statements: {
        total: statements.length,
        covered: statements.filter(count => count > 0).length,
        skipped: 0,
        pct: this.calculatePercentage(
          statements.filter(count => count > 0).length,
          statements.length
        ),
      },
      branches: {
        total: branches.length,
        covered: branches.filter(count => count > 0).length,
        skipped: 0,
        pct: this.calculatePercentage(branches.filter(count => count > 0).length, branches.length),
      },
    };
  }

  private calculatePercentage(covered: number, total: number): number {
    return total === 0 ? 0 : Math.round((covered / total) * 100 * 100) / 100;
  }

  private async generateHtmlReport(coverageData: CoverageData, summary: any): Promise<void> {
    const html = this.createHtmlReport(summary.total);
    const htmlPath = join(this.outputDir, 'index.html');
    writeFileSync(htmlPath, html);
    console.log(`📄 Generated: ${htmlPath}`);
  }

  private createHtmlReport(summary: CoverageSummary): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Combined Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #495057; margin-bottom: 10px; }
        .metric-label { color: #6c757d; font-size: 1.1em; }
        .coverage-bar { background: #e9ecef; height: 25px; border-radius: 12px; overflow: hidden; margin: 10px 0; position: relative; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .coverage-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); }
        .timestamp { color: rgba(255,255,255,0.8); margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Combined Coverage Report</h1>
            <p class="timestamp">Generated: ${new Date().toISOString()}</p>
        </div>
        <div class="content">
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${summary.lines.pct.toFixed(1)}%</div>
                    <div class="metric-label">Lines Coverage</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.lines.pct}%"></div>
                        <div class="coverage-text">${summary.lines.covered}/${summary.lines.total}</div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-value">${summary.functions.pct.toFixed(1)}%</div>
                    <div class="metric-label">Functions Coverage</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.functions.pct}%"></div>
                        <div class="coverage-text">${summary.functions.covered}/${summary.functions.total}</div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-value">${summary.statements.pct.toFixed(1)}%</div>
                    <div class="metric-label">Statements Coverage</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.statements.pct}%"></div>
                        <div class="coverage-text">${summary.statements.covered}/${summary.statements.total}</div>
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-value">${summary.branches.pct.toFixed(1)}%</div>
                    <div class="metric-label">Branches Coverage</div>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: ${summary.branches.pct}%"></div>
                        <div class="coverage-text">${summary.branches.covered}/${summary.branches.total}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private async generateLcovReport(coverageData: CoverageData): Promise<void> {
    let lcovContent = '';

    for (const [filePath, fileData] of Object.entries(coverageData)) {
      lcovContent += `SF:${filePath}\n`;

      // Function coverage
      for (const [key, fnData] of Object.entries(fileData.fnMap)) {
        const fnInfo = fnData as any;
        lcovContent += `FN:${fnInfo.loc.start.line},${fnInfo.name}\n`;
      }

      for (const [key, count] of Object.entries(fileData.f)) {
        const fnData = fileData.fnMap[key] as any;
        lcovContent += `FNDA:${count},${fnData.name}\n`;
      }

      lcovContent += `FNF:${Object.keys(fileData.fnMap).length}\n`;
      lcovContent += `FNH:${Object.values(fileData.f).filter(count => count > 0).length}\n`;

      // Branch coverage
      for (const [key, branchData] of Object.entries(fileData.branchMap)) {
        const branch = branchData as any;
        lcovContent += `BDA:${branch.loc.start.line},${key},0,${fileData.b[key][0] || 0}\n`;
        lcovContent += `BDA:${branch.loc.start.line},${key},1,${fileData.b[key][1] || 0}\n`;
      }

      const totalBranches = Object.keys(fileData.branchMap).length * 2;
      const coveredBranches = Object.values(fileData.b)
        .flat()
        .filter(count => count > 0).length;
      lcovContent += `BRF:${totalBranches}\n`;
      lcovContent += `BRH:${coveredBranches}\n`;

      // Line coverage
      for (const [key, count] of Object.entries(fileData.s)) {
        const stmtData = fileData.statementMap[key] as any;
        lcovContent += `DA:${stmtData.start.line},${count}\n`;
      }

      const totalLines = Object.keys(fileData.s).length;
      const coveredLines = Object.values(fileData.s).filter(count => count > 0).length;
      lcovContent += `LF:${totalLines}\n`;
      lcovContent += `LH:${coveredLines}\n`;

      lcovContent += 'end_of_record\n';
    }

    const lcovPath = join(this.outputDir, 'lcov.info');
    writeFileSync(lcovPath, lcovContent);
    console.log(`📄 Generated: ${lcovPath}`);
  }

  private displaySummary(summary: { total: CoverageSummary }): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 COMBINED COVERAGE SUMMARY');
    console.log('='.repeat(50));
    console.log(
      `Lines:      ${summary.total.lines.pct.toFixed(1)}% (${summary.total.lines.covered}/${summary.total.lines.total})`
    );
    console.log(
      `Functions:  ${summary.total.functions.pct.toFixed(1)}% (${summary.total.functions.covered}/${summary.total.functions.total})`
    );
    console.log(
      `Statements: ${summary.total.statements.pct.toFixed(1)}% (${summary.total.statements.covered}/${summary.total.statements.total})`
    );
    console.log(
      `Branches:   ${summary.total.branches.pct.toFixed(1)}% (${summary.total.branches.covered}/${summary.total.branches.total})`
    );
    console.log('='.repeat(50));
  }
}

// CLI interface
async function main() {
  try {
    const aggregator = new CoverageAggregator();
    await aggregator.aggregate();
  } catch (error) {
    console.error('❌ Coverage aggregation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default CoverageAggregator;
