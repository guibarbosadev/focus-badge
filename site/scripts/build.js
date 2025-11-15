const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "public");
const distDir = path.join(__dirname, "..", "dist");

/**
 * Recursively copy source directory to destination.
 */
function copyDir(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

copyDir(srcDir, distDir);
console.log(`Site assets copied to ${distDir}`);
