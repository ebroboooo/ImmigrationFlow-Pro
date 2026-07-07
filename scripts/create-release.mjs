/**
 * Creates ImmigrationFlow AI v1.0 RC1 release ZIP.
 * Excludes node_modules, dist, dev artifacts, and VCS metadata.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const RELEASE_DIR = join(ROOT, 'release');
const ZIP_NAME = 'ImmigrationFlowAI_v1.0_RC1.zip';
const ZIP_PATH = join(RELEASE_DIR, ZIP_NAME);

const EXCLUDES = [
  'node_modules',
  'dist',
  'dev-dist',
  'coverage',
  '.temp',
  '.cache',
  'logs',
  '.git',
  'release',
  'playwright-report',
  'test-results',
  '.cursor',
  'mcps',
  'agent-transcripts',
  'terminals',
];

function createReleaseZip() {
  mkdirSync(RELEASE_DIR, { recursive: true });

  if (existsSync(ZIP_PATH)) {
    rmSync(ZIP_PATH, { force: true });
  }

  const excludeArgs = EXCLUDES.flatMap((name) => ['--exclude', name]);
  const tarCmd = ['tar', '-a', '-c', '-f', ZIP_PATH, ...excludeArgs, '.'].join(' ');

  execSync(tarCmd, { cwd: ROOT, stdio: 'inherit', shell: true });

  if (!existsSync(ZIP_PATH)) {
    throw new Error(`Release ZIP was not created at ${ZIP_PATH}`);
  }

  process.stdout.write(`\nRelease package created: ${ZIP_PATH}\n`);
}

createReleaseZip();
