import fs from 'fs';
import path from 'path';

/**
 * Gets the workspace root path regardless of whether we're in src or dist
 */
export function getWorkspaceRoot(): string {
  // If running from dist, go up to the project root
  if (__dirname.includes('/dist/')) {
    const distIndex = __dirname.indexOf('/dist/');
    return __dirname.substring(0, distIndex);
  }
  // If already in src, go up to find workspace root (typically 3-4 levels up from apps/api/src)
  // __dirname might be: /workspace/apps/api/src/common/scripts
  // We want: /workspace
  let current = __dirname;
  while (current !== path.dirname(current)) {
    // Check if we're at the workspace root (has node_modules or nx.json)
    if (
      fs.existsSync(path.join(current, 'nx.json')) ||
      fs.existsSync(path.join(current, 'node_modules'))
    ) {
      return current;
    }
    current = path.dirname(current);
  }
  // Fallback: assume we're 4 levels up from the script
  return path.join(__dirname, '..', '..', '..', '..');
}
