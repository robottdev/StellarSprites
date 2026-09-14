#!/usr/bin/env python3
"""Static file server with no-cache headers for HTML/JS/CSS."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))
ROOT = os.path.dirname(os.path.abspath(__file__))
NO_CACHE_EXT = (".html", ".js", ".css", ".mjs", ".map")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0].lower()
        if path.endswith(NO_CACHE_EXT) or path.endswith("/"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args), flush=True)


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Serving %s on 0.0.0.0:%s" % (ROOT, PORT), flush=True)
    httpd.serve_forever()
