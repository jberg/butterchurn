import http from 'http';
import fs from 'fs';
import path from 'path';

class TestServer {
  constructor() {
    this.server = null;
    this.port = null;
  }

  async start() {
    const projectRoot = process.cwd();

    this.server = http.createServer((req, res) => {
      let filePath;

      if (req.url === '/' || req.url === '/test-js.html') {
        filePath = path.join(process.cwd(), 'test/visual/test-js.html');
      } else if (req.url === '/test-wasm.html') {
        filePath = path.join(process.cwd(), 'test/visual/test-wasm.html');
      } else if (req.url.startsWith('/')) {
        filePath = path.join(projectRoot, req.url);
      } else {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const ext = path.extname(filePath);
        const contentTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.json': 'application/json'
        };
        const contentType = contentTypes[ext] || 'text/html';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    return new Promise((resolve) => {
      this.server.listen(0, 'localhost', () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }

  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

export default TestServer;
