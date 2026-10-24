# -*- coding: utf-8 -*-
"""本地预览服务器：python tools/serve.py [端口]，默认 8932"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8932

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def guess_type(self, path):
        t = super().guess_type(path)
        if t and t.startswith("text/"):
            return t + "; charset=utf-8"
        return t

    def log_message(self, *a):
        pass

if __name__ == "__main__":
    print("serving", ROOT, "on http://127.0.0.1:%d" % PORT)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
