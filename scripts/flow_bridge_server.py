#!/usr/bin/env python3
"""
PRECIPICE Production Hub — Local Google Flow Chrome Automation Bridge
Listens on http://127.0.0.1:8765
Drives Google Flow (https://flow.google.com) in Google Chrome via AppleScript + JS
whenever the user clicks "⚡ Start to Generate in Google Flow" on the website.
"""
import argparse
import http.server
import json
import os
import socketserver
import subprocess
import threading
import time
import urllib.request
from datetime import datetime

PORT = 8765
BASE_DIR = "/Users/studio/Desktop/helloworld/precipice-studio"
GEN_DIR = os.path.join(BASE_DIR, "assets/generated")
os.makedirs(GEN_DIR, exist_ok=True)

JOBS = []
JOBS_LOCK = threading.Lock()


def find_flow_tab():
    """Finds the active Google Flow project tab in Google Chrome, preferring fc62d0fe."""
    apple = '''
    tell application "Google Chrome"
        set fallback to ""
        repeat with w in windows
            set wid to id of w
            set tidx to 1
            repeat with t in tabs of w
                set turl to URL of t
                if turl contains "fc62d0fe-0303-4e5a-8864-0d8a9aee5bbe" then
                    return (wid as string) & "|" & (tidx as string) & "|" & turl
                end if
                if fallback is "" and turl contains "flow.google.com/project/" then
                    set fallback to (wid as string) & "|" & (tidx as string) & "|" & turl
                end if
                set tidx to tidx + 1
            end repeat
        end repeat
        return fallback
    end tell
    '''
    res = subprocess.run(["osascript", "-e", apple], capture_output=True, text=True)
    out = res.stdout.strip()
    if out and "|" in out:
        parts = out.split("|", 2)
        return {"windowId": parts[0], "tabIndex": parts[1], "url": parts[2]}
    return None


def chrome_js(wid, tidx, js_code):
    escaped = js_code.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    apple = f'''
    tell application "Google Chrome"
        tell tab {tidx} of window id {wid}
            execute javascript "{escaped}"
        end tell
    end tell
    '''
    res = subprocess.run(["osascript", "-e", apple], capture_output=True, text=True)
    if res.returncode != 0:
        return f"ERR: {res.stderr.strip()}"
    return res.stdout.strip()


def activate_flow_tab(wid, tidx):
    apple = f'''
    tell application "Google Chrome"
        set active tab index of window id {wid} to {tidx}
        activate
    end tell
    '''
    subprocess.run(["osascript", "-e", apple], capture_output=True, text=True)


def set_flow_prompt(wid, tidx, prompt_text):
    p_json = json.dumps(prompt_text)
    js_clear = """
    (function() {
        const ed = document.querySelector('div[contenteditable="true"].ProseMirror');
        if (!ed) return 'NO_EDITOR';
        ed.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        return 'CLEARED';
    })()
    """
    chrome_js(wid, tidx, js_clear)
    time.sleep(0.35)
    js_insert = f"""
    (function() {{
        const ed = document.querySelector('div[contenteditable="true"].ProseMirror');
        if (!ed) return 'NO_EDITOR';
        ed.focus();
        document.execCommand('insertText', false, {p_json});
        return 'INSERTED:' + ed.innerText.length;
    }})()
    """
    return chrome_js(wid, tidx, js_insert)


def attach_flow_ingredient(wid, tidx, ingredient_query="avatar"):
    q_json = json.dumps(ingredient_query.lower())
    js_open = """
    (function() {
        const icons = Array.from(document.querySelectorAll('button i.google-symbols, button span'));
        for (const ic of icons) {
            const t = ic.innerText.trim();
            if (t === 'add_2' || t === 'add') {
                const btn = ic.closest('button');
                if (btn) { btn.click(); return 'OPENED_PICKER'; }
            }
        }
        return 'NO_ADD_BTN';
    })()
    """
    r1 = chrome_js(wid, tidx, js_open)
    if "OPENED" not in r1:
        return r1
    time.sleep(1.2)
    js_pick = f"""
    (function() {{
        const all = Array.from(document.querySelectorAll('div, span, p, button'));
        for (const el of all) {{
            const txt = (el.innerText || '').trim().toLowerCase();
            if (txt.includes({q_json}) && el.children.length === 0) {{
                let target = el.closest('button') || el.parentElement;
                if (target) {{
                    target.click();
                    return 'ATTACHED:' + txt;
                }}
            }}
        }}
        document.body.click();
        return 'INGREDIENT_NOT_FOUND';
    }})()
    """
    res = chrome_js(wid, tidx, js_pick)
    time.sleep(0.6)
    return res


def submit_flow_generation(wid, tidx):
    js_submit = """
    (function() {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const b of buttons) {
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const txt = (b.innerText || '').trim();
            if (aria.includes('start generation') || b.classList.contains('generate-icon-button') || txt === 'arrow_forward') {
                if (b.disabled) return 'BUTTON_DISABLED';
                b.click();
                return 'SUBMITTED';
            }
        }
        return 'NO_SUBMIT_BTN';
    })()
    """
    return chrome_js(wid, tidx, js_submit)


def get_flow_media_urls(wid, tidx):
    js = """
    (function() {
        const vids = Array.from(document.querySelectorAll('video')).map(v => v.src).filter(Boolean);
        const imgs = Array.from(document.querySelectorAll('img'))
            .map(i => i.src)
            .filter(s => s && (s.includes('googleusercontent') || s.includes('flow.google.com/fx/api') || s.startsWith('blob:') || s.startsWith('https://storage.googleapis.com')));
        return JSON.stringify({ videos: [...new Set(vids)], images: [...new Set(imgs)] });
    })()
    """
    raw = chrome_js(wid, tidx, js)
    try:
        return json.loads(raw)
    except Exception:
        return {"videos": [], "images": []}


def execute_flow_job(job):
    job_id = job["jobId"]
    tab = find_flow_tab()
    if not tab:
        with JOBS_LOCK:
            job["status"] = "ERROR"
            job["message"] = "No open flow.google.com/project/ tab found in Google Chrome."
        return

    wid, tidx = tab["windowId"], tab["tabIndex"]
    job["flowTab"] = tab

    if job.get("bringToFront"):
        activate_flow_tab(wid, tidx)

    before_media = get_flow_media_urls(wid, tidx)
    before_vids = set(before_media.get("videos", []))

    with JOBS_LOCK:
        job["status"] = "INJECTING_PROMPT"
        job["message"] = f"Injecting prompt into Chrome Window {wid} Tab {tidx}..."

    if job.get("attachAvatar"):
        attach_res = attach_flow_ingredient(wid, tidx, job.get("ingredientQuery", "avatar"))
        job["attachResult"] = attach_res

    ins_res = set_flow_prompt(wid, tidx, job["prompt"])
    job["insertResult"] = ins_res
    time.sleep(0.5)

    sub_res = submit_flow_generation(wid, tidx)
    job["submitResult"] = sub_res

    if "SUBMITTED" not in sub_res:
        with JOBS_LOCK:
            job["status"] = "PROMPT_STAGED"
            job["message"] = f"Prompt staged in Google Flow editor ({ins_res}, submit={sub_res}). Ready in Chrome!"
        return

    with JOBS_LOCK:
        job["status"] = "GENERATING_IN_FLOW"
        job["message"] = "Submitted to Google Flow! Generating asset in Chrome..."

    # Poll up to 180s for newly completed video MP4 URL
    start_t = time.time()
    while time.time() - start_t < 180:
        time.sleep(8)
        curr_media = get_flow_media_urls(wid, tidx)
        new_vids = [u for u in curr_media.get("videos", []) if u not in before_vids]
        if new_vids:
            target_url = new_vids[0]
            slug = job.get("id", f"flow_{int(time.time())}")
            out_file = os.path.join(GEN_DIR, f"{slug}.mp4")
            try:
                req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=45) as resp, open(out_file, "wb") as f:
                    f.write(resp.read())
                with JOBS_LOCK:
                    job["status"] = "COMPLETED"
                    job["outputFile"] = f"assets/generated/{slug}.mp4"
                    job["message"] = f"Generated & saved to assets/generated/{slug}.mp4"
                return
            except Exception as e:
                with JOBS_LOCK:
                    job["status"] = "COMPLETED_IN_BROWSER"
                    job["message"] = f"Generated in Google Flow tab ({str(e)})"
                return

    with JOBS_LOCK:
        job["status"] = "SUBMITTED_IN_BROWSER"
        job["message"] = "Generation active in Google Flow Chrome tab."


class HubRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/status"):
            tab = find_flow_tab()
            gen_files = sorted(os.listdir(GEN_DIR)) if os.path.exists(GEN_DIR) else []
            with JOBS_LOCK:
                jobs_snapshot = list(JOBS[-15:])
            payload = {
                "ok": True,
                "bridge": "ONLINE",
                "port": PORT,
                "timestamp": datetime.now().isoformat(),
                "chromeFlowTab": tab,
                "jobs": jobs_snapshot,
                "generatedFiles": gen_files,
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/flow-generate"):
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                data = json.loads(raw)
            except Exception:
                data = {}

            job_id = f"job_{int(time.time() * 1000)}"
            job = {
                "jobId": job_id,
                "id": data.get("id", job_id),
                "title": data.get("title", "PRECIPICE Flow Generation"),
                "characterName": data.get("characterName", ""),
                "prompt": data.get("prompt", ""),
                "mode": data.get("mode", "video"),
                "attachAvatar": bool(data.get("attachAvatar", False)),
                "ingredientQuery": data.get("ingredientQuery", "avatar"),
                "bringToFront": bool(data.get("bringToFront", False)),
                "status": "QUEUED",
                "message": "Dispatching to Google Flow Chrome Tab...",
                "createdAt": datetime.now().strftime("%H:%M:%S"),
            }
            with JOBS_LOCK:
                JOBS.append(job)

            t = threading.Thread(target=execute_flow_job, args=(job,), daemon=True)
            t.start()

            # Wait briefly so initial injection result is included in response
            time.sleep(1.4)
            with JOBS_LOCK:
                resp_payload = {"ok": True, "job": dict(job)}

            body = json.dumps(resp_payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PRECIPICE Google Flow Local Automation Bridge")
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--test-prompt", type=str, default=None, help="Run a one-shot prompt injection into Google Flow")
    args = parser.parse_args()

    if args.test_prompt:
        tab = find_flow_tab()
        print("Detected Flow Tab:", tab)
        if tab:
            r_ins = set_flow_prompt(tab["windowId"], tab["tabIndex"], args.test_prompt)
            r_sub = submit_flow_generation(tab["windowId"], tab["tabIndex"])
            print("Insert:", r_ins, "| Submit:", r_sub)
    else:
        print(f"⚡ PRECIPICE Google Flow Bridge listening on http://127.0.0.1:{args.port}")
        with ThreadedTCPServer(("127.0.0.1", args.port), HubRequestHandler) as httpd:
            httpd.serve_forever()
