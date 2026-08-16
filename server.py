#!/usr/bin/env python3
import json
import os
import secrets
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
PORT = int(os.environ.get("PORT", "8000"))
TOKENS = {}


def load_store():
    if not DATA_FILE.exists():
        DATA_FILE.write_text('{"gallery": [], "tutorials": []}', encoding="utf-8")
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError:
            data = {"gallery": [], "tutorials": []}
    data.setdefault("gallery", [])
    data.setdefault("tutorials", [])
    return data


def save_store(store):
    with DATA_FILE.open("w", encoding="utf-8") as handle:
        json.dump(store, handle, ensure_ascii=False, indent=2)


def clean_tokens():
    now = time.time()
    expired = [token for token, expires_at in TOKENS.items() if expires_at <= now]
    for token in expired:
        TOKENS.pop(token, None)


def get_bearer_token(headers):
    auth = headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def is_valid_token(token):
    clean_tokens()
    if not token:
        return False
    expires_at = TOKENS.get(token)
    if expires_at is None:
        return False
    if expires_at <= time.time():
        TOKENS.pop(token, None)
        return False
    return True


def generate_token():
    token = secrets.token_urlsafe(24)
    TOKENS[token] = time.time() + 12 * 60 * 60
    return token


class SiteHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api()
            return

        if parsed.path in ("", "/"):
            target = ROOT / "index.html"
        else:
            target = ROOT / parsed.path.lstrip("/")

        if not target.exists() or target.is_dir():
            self.send_error(404)
            return

        self.path = str(target.relative_to(ROOT))
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api()
            return

        self.send_error(405)

    def handle_api(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_body()

        if path == "/api/health":
            self.send_json(200, {"status": "ok"})
            return

        if path == "/api/login":
            data = body or {}
            password = data.get("password", "")
            if password != ADMIN_PASSWORD:
                self.send_json(401, {"error": "Invalid password"})
                return
            token = generate_token()
            self.send_json(200, {"token": token})
            return

        if path == "/api/gallery":
            if self.command == "GET":
                self.send_json(200, load_store().get("gallery", []))
                return

            token = get_bearer_token(self.headers)
            if not is_valid_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return

            data = body or {}
            title = (data.get("title") or "").strip()
            cover = (data.get("cover") or "").strip()
            if not title or not cover:
                self.send_json(400, {"error": "Title and cover are required."})
                return

            store = load_store()
            item = {
                "title": title,
                "artist": (data.get("artist") or "Bengazy").strip(),
                "description": (data.get("description") or "").strip(),
                "price": data.get("price", 0),
                "cover": cover,
                "progress": data.get("progress", []) or [],
            }
            store.setdefault("gallery", []).insert(0, item)
            save_store(store)
            self.send_json(201, item)
            return

        if path == "/api/tutorials":
            if self.command == "GET":
                self.send_json(200, load_store().get("tutorials", []))
                return

            token = get_bearer_token(self.headers)
            if not is_valid_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return

            data = body or {}
            title = (data.get("title") or "Untitled tutorial").strip()
            url = (data.get("url") or "").strip()
            if not url:
                self.send_json(400, {"error": "Tutorial URL is required."})
                return

            store = load_store()
            item = {"title": title, "url": url}
            store.setdefault("tutorials", []).insert(0, item)
            save_store(store)
            self.send_json(201, item)
            return

        self.send_error(404)

    def read_body(self):
        content_length = self.headers.get("Content-Length")
        if not content_length:
            return {}
        try:
            length = int(content_length)
        except ValueError:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}


if __name__ == "__main__":
    os.chdir(ROOT)
    print(f"Bengazy Arts admin server running at http://localhost:{PORT}")
    print(f"Default admin password: {ADMIN_PASSWORD}")
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), SiteHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopping...")
    finally:
        httpd.server_close()
