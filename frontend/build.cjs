// ==============================================================================
// ReliabilityX — Offline React 18 TypeScript Compiler & Multi-Module Bundler (.cjs)
// SIH26170: AI-Driven Anomaly Detection in Component Burn-In & Screening
// ==============================================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = __dirname;
const staticDir = path.join(rootDir, 'static');
const destPath = path.join(staticDir, 'app.bundle.js');
const babelPath = path.join(staticDir, 'vendor', 'babel.min.js');

if (!fs.existsSync(babelPath)) {
  console.error("Error: babel.min.js not found at", babelPath);
  process.exit(1);
}

// Load Babel Standalone in isolated VM
const sandbox = { window: {}, console: console, process: { env: {} } };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(babelPath, 'utf8'), sandbox);
const Babel = sandbox.Babel;

// Collect all .ts and .tsx files recursively from a directory
function collectSourceFiles(dir, baseDir = dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor' && entry.name !== 'node_modules') {
        files = files.concat(collectSourceFiles(fullPath, baseDir));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.d.ts')) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

function build() {
  const startTime = Date.now();
  try {
    const sourceFiles = collectSourceFiles(staticDir);
    console.log(`[ReliabilityX Build] Compiling ${sourceFiles.length} source modules...`);

    const compiledModules = [];

    for (const file of sourceFiles) {
      const code = fs.readFileSync(file.fullPath, 'utf8');
      const result = Babel.transform(code, {
        filename: file.relPath,
        presets: ['react', 'typescript'],
        plugins: ['transform-modules-commonjs']
      });

      compiledModules.push({
        id: file.relPath,
        code: result.code
      });
    }

    // Build the self-executing bundle runtime
    let bundleCode = `// ReliabilityX Bundled Application (${new Date().toISOString()})\n`;
    bundleCode += `(function() {\n`;
    bundleCode += `  if (typeof window !== 'undefined') {\n`;
    bundleCode += `    if (window.React && !window.React.default) window.React.default = window.React;\n`;
    bundleCode += `    if (window.ReactDOM && !window.ReactDOM.default) window.ReactDOM.default = window.ReactDOM;\n`;
    bundleCode += `  }\n`;
    bundleCode += `  var modules = {};\n`;
    bundleCode += `  function define(id, fn) {\n`;
    bundleCode += `    modules[id] = { fn: fn, exports: null };\n`;
    bundleCode += `  }\n`;
    bundleCode += `  function resolve(baseDir, requestedId) {\n`;
    bundleCode += `    if (requestedId === 'react') return 'react';\n`;
    bundleCode += `    if (requestedId === 'react-dom') return 'react-dom';\n`;
    bundleCode += `    var target = requestedId;\n`;
    bundleCode += `    if (target.charAt(0) === '.') {\n`;
    bundleCode += `      var combined = baseDir ? (baseDir + '/' + target) : target;\n`;
    bundleCode += `      var parts = combined.split('/');\n`;
    bundleCode += `      var stack = [];\n`;
    bundleCode += `      for (var i = 0; i < parts.length; i++) {\n`;
    bundleCode += `        var p = parts[i];\n`;
    bundleCode += `        if (!p || p === '.') continue;\n`;
    bundleCode += `        if (p === '..') { stack.pop(); } else { stack.push(p); }\n`;
    bundleCode += `      }\n`;
    bundleCode += `      target = stack.join('/');\n`;
    bundleCode += `    } else {\n`;
    bundleCode += `      target = target.replace(/^\\.\\//, '');\n`;
    bundleCode += `    }\n`;
    bundleCode += `    var extensions = ['', '.tsx', '.ts', '.js', '/index.tsx', '/index.ts'];\n`;
    bundleCode += `    for (var j = 0; j < extensions.length; j++) {\n`;
    bundleCode += `      var candidate = target + extensions[j];\n`;
    bundleCode += `      if (modules[candidate]) return candidate;\n`;
    bundleCode += `    }\n`;
    bundleCode += `    return target;\n`;
    bundleCode += `  }\n`;
    bundleCode += `  function makeRequire(baseDir) {\n`;
    bundleCode += `    return function req(id) {\n`;
    bundleCode += `      if (id === 'react') return window.React;\n`;
    bundleCode += `      if (id === 'react-dom') return window.ReactDOM;\n`;
    bundleCode += `      var resolvedId = resolve(baseDir, id);\n`;
    bundleCode += `      var mod = modules[resolvedId];\n`;
    bundleCode += `      if (!mod) {\n`;
    bundleCode += `        throw new Error("[ReliabilityX Bundle] Module not found: " + id + " (resolved: " + resolvedId + ")");\n`;
    bundleCode += `      }\n`;
    bundleCode += `      if (!mod.exports) {\n`;
    bundleCode += `        mod.exports = {};\n`;
    bundleCode += `        var lastSlash = resolvedId.lastIndexOf('/');\n`;
    bundleCode += `        var modDir = lastSlash !== -1 ? resolvedId.substring(0, lastSlash) : '';\n`;
    bundleCode += `        mod.fn(mod, mod.exports, makeRequire(modDir));\n`;
    bundleCode += `      }\n`;
    bundleCode += `      return mod.exports;\n`;
    bundleCode += `    };\n`;
    bundleCode += `  }\n\n`;

    // Append each module definition
    for (const mod of compiledModules) {
      bundleCode += `  // Module: ${mod.id}\n`;
      bundleCode += `  define(${JSON.stringify(mod.id)}, function(module, exports, require) {\n`;
      bundleCode += mod.code + `\n`;
      bundleCode += `  });\n\n`;
    }

    // Execute app entry point
    bundleCode += `  makeRequire('')('app.tsx');\n`;
    bundleCode += `})();\n`;

    fs.writeFileSync(destPath, bundleCode, 'utf8');
    
    // Prepare dist directory for Vercel deployment
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
    const distStaticDir = path.join(distDir, 'static');
    if (fs.existsSync(distStaticDir)) {
      fs.rmSync(distStaticDir, { recursive: true, force: true });
    }
    fs.cpSync(staticDir, distStaticDir, { recursive: true });

    const elapsed = Date.now() - startTime;
    console.log(`[ReliabilityX Build] Successfully bundled ${compiledModules.length} modules -> app.bundle.js (${bundleCode.length} bytes in ${elapsed}ms)`);
    console.log(`[ReliabilityX Build] Production output prepared in ${distDir}`);
  } catch (err) {
    console.error(`[ReliabilityX Build] Transpilation failed:`, err.message);
  }
}

// Initial Build
build();

// Watch mode support
if (process.argv.includes('--watch')) {
  console.log(`[ReliabilityX Build] Watching ${staticDir} for changes...`);
  let timeoutId = null;
  fs.watch(staticDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts')) && !filename.includes('app.bundle.js')) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log(`[ReliabilityX Build] Change detected in ${filename}, recompiling...`);
        build();
      }, 150);
    }
  });
}
