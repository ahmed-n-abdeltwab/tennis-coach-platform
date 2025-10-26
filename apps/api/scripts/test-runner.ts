#!/usr/bin/env tsx

import { spawn, SpawnOptions } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestRunnerOptions {
  type: 'unit' | 'integration' | 'e2e' | 'all';
  watch?: boolean;
  coverage?: boolean;
  debug?: boolean;
  ci?: boolean;
  changed?: boolean;
  verbose?: boolean;
  bail?: boolean;
  parallel?: boolean;
  updateSnapshot?: boolean;
  testNamePattern?: string;
  testPathPattern?: string;
  maxWorkers?: number;
  silent?: boolean;
}

class TestRunner {
  private readonly configMap = {
    unit: 'jest.config.ts',
    integration: 'jest.integration.config.ts',
    e2e: 'jest.e2e.config.ts',
    all: 'jest.all.config.ts',
  };

  async run(options: TestRunnerOptions): Promise<void> {
    console.log('🧪 Tennis Coach API Test Runner');
    console.log('================================');

    // Validate configuration
    await this.validateEnvironment(options);

    // Build Jest command
    const command = this.buildJestCommand(options);

    // Display execution info
    this.displayExecutionInfo(options, command);

    // Execute tests
    await this.executeTests(command, options);
  }

  private async validateEnvironment(options: TestRunnerOptions): Promise<void> {
    const configFile = this.configMap[options.type];
    const configPath = join(process.cwd(), conf);

    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    // Check for required environment variables for integration/e2e tests
    if (options.type === 'integration' || options.type === 'e2e') {
      if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
        console.warn('⚠️  Warning: No test database URL configured');
      }
    }

    // Check for debug requirements
    if (options.debug) {
      console.log('🐛 Debug mode enabled - tests will run in single process');
    }

    console.log(`✅ Environment validated for ${options.type} tests`);
  }

  private buildJestCommand(options: TestRunnerOptions): string[] {
    const command = ['jest'];
    const configFile = this.configMap[options.type];

    // Base configuration
    command.push('--config', configFile);

    // Test execution options
    if (options.watch) command.push('--watch');
    if (options.coverage) command.push('--coverage');
    if (options.ci) {
      command.push('--ci', '--watchAll=false', '--passWithNoTests');
    }
    if (options.changed) command.push('--onlyChanged');
    if (options.verbose) command.push('--verbose');
    if (options.bail) command.push('--bail');
    if (options.updateSnapshot) command.push('--updateSnapshot');
    if (options.silent) command.push('--silent');

    // Debug mode
    if (options.debug) {
      command.push('--runInBand', '--no-cache');
    }

    // Parallel execution control
    if (options.parallel === false || options.type === 'integration' || options.type === 'e2e') {
      command.push('--runInBand');
    } else if (options.maxWorkers) {
      command.push('--maxWorkers', options.maxWorkers.toString());
    }

    // Pattern matching
    if (options.testNamePattern) {
      command.push('--testNamePattern', options.testNamePattern);
    }
    if (options.testPathPattern) {
      command.push('--testPathPattern', options.testPathPattern);
    }

    // Add custom reporter
    command.push('--reporters', 'default', '--reporters', './test/utils/jest-custom-reporter.ts');

    return command;
  }

  private displayExecutionInfo(options: TestRunnerOptions, command: string[]): void {
    console.log(`📋 Test Type: ${options.type.toUpperCase()}`);
    console.log(`🔧 Configuration: ${this.configMap[options.type]}`);
    console.log(`⚙️  Command: ${command.join(' ')}`);

    if (options.debug) {
      console.log('🐛 Debug mode: Connect your debugger to port 9229');
    }

    if (options.type === 'integration' || options.type === 'e2e') {
      console.log('🗄️  Database tests: Ensure test database is available');
    }

    console.log('================================\n');
  }

  private async executeTests(command: string[], options: TestRunnerOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          // Enable debug mode if requested
          ...(options.debug && {
            NODE_OPTIONS: '--inspect-brk=9229',
          }),
        },
      };

      const child = spawn(command[0], command.slice(1), spawnOptions);

      child.on('close', code => {
        if (code === 0) {
          console.log('\n✅ Tests completed successfully!');
          resolve();
        } else {
          console.log(`\n❌ Tests failed with exit code ${code}`);
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        console.error('❌ Failed to start test process:', error);
        reject(error);
      });

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        child.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        child.kill('SIGTERM');
      });
    });
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: TestRunnerOptions = {
    type: 'unit', // default
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--type':
        options.type = args[++i] as TestRunnerOptions['type'];
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--changed':
        options.changed = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--update-snapshot':
        options.updateSnapshot = true;
        break;
      case '--silent':
        options.silent = true;
        break;
      case '--test-name-pattern':
        options.testNamePattern = args[++i];
        break;
      case '--test-path-pattern':
        options.testPathPattern = args[++i];
        break;
      case '--max-workers':
        options.maxWorkers = parseInt(args[++i], 10);
        break;
      case '--help':
        displayHelp();
        process.exit(0);
        break;
    }
  }

  try {
    const runner = new TestRunner();
    await runner.run(options);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

function displayHelp() {
  console.log(`
🧪 Tennis Coach API Test Runner

Usage: tsx scripts/test-runner.ts [options]

Options:
  --type <type>              Test type: unit, integration, e2e, all (default: unit)
  --watch                    Watch mode
  --coverage                 Generate coverage report
  --debug                    Enable debug mode (runs on port 9229)
  --ci                       CI mode (no watch, pass with no tests)
  --changed                  Run only changed tests
  --verbose                  Verbose output
  --bail                     Stop on first test failure
  --no-parallel              Disable parallel execution
  --update-snapshot          Update snapshots
  --silent                   Silent mode
  --test-name-pattern <pattern>    Run tests matching name pattern
  --test-path-pattern <pattern>    Run tests matching path pattern
  --max-workers <number>     Maximum number of worker processes
  --help                     Show this help message

Examples:
  tsx scripts/test-runner.ts --type unit --coverage
  tsx scripts/test-runner.ts --type integration --debug
  tsx scripts/test-runner.ts --type e2e --ci
  tsx scripts/test-runner.ts --type all --watch
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default TestRunner;
