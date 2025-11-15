const http = require("http");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const relativePath = req.url === "/" ? "index.html" : req.url.replace(/^\//, "");
  const requestedPath = path.join(publicDir, relativePath);

  if (!requestedPath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(requestedPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(requestedPath).toLowerCase();
    res.setHeader("Content-Type", mimeTypes[ext] || "text/plain");
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`FocusBadge site running at http://localhost:${port}`);
});
