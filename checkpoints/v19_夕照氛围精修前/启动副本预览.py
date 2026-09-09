#!/usr/bin/env python3
"""Serve this copy only; never reuse a different project at the same port."""
import argparse, functools, http.server, json, threading, urllib.request, webbrowser
from pathlib import Path
ROOT = Path(__file__).resolve().parent
PORT = 8770
URL = f"http://127.0.0.1:{PORT}/preview/?v=19-workcopy"
parser = argparse.ArgumentParser()
parser.add_argument("--no-open", action="store_true")
args = parser.parse_args()
expected = json.loads((ROOT / "preview/workcopy-id.json").read_text())
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/preview/workcopy-id.json", timeout=2) as response:
        existing = json.load(response)
except Exception:
    existing = None
if existing == expected:
    print("副本预览已在运行：" + URL, flush=True)
    if not args.no_open:
        webbrowser.open(URL)
    raise SystemExit(0)
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()
try:
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=str(ROOT)))
except OSError:
    raise SystemExit("8770 端口已被其他服务占用；没有复用或关闭该服务。请让新对话检查端口。")
print("优化工作副本：" + str(ROOT), flush=True)
print("预览地址：" + URL, flush=True)
print("关闭此窗口或按 Ctrl+C 可停止预览。", flush=True)
if not args.no_open:
    threading.Timer(.4, lambda: webbrowser.open(URL)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
