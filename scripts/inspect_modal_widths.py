import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\449ccba3-deb9-4397-9d83-3fba0fe274e9"

VIEWPORTS = [
    ("w1280", 1280, 800),
    ("w1024", 1024, 768),
    ("w900", 900, 700),
    ("w768", 768, 1024),
    ("w600", 600, 900),
    ("w480", 480, 850),
    ("w390", 390, 844)
]

async def inspect():
    port = 9285
    user_data_dir = os.path.join(ARTIFACT_DIR, "scratch", "chrome_modal_widths")
    os.makedirs(user_data_dir, exist_ok=True)

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://127.0.0.1:8000/?nointro=1#dashboard"
    ]
    proc = subprocess.Popen(cmd)

    try:
        ws_url = None
        for _ in range(30):
            try:
                res = urllib.request.urlopen(f"http://127.0.0.1:{port}/json")
                targets = json.loads(res.read())
                for t in targets:
                    if t.get("type") == "page" and "8000" in t.get("url", ""):
                        ws_url = t.get("webSocketDebuggerUrl")
                        break
                if not ws_url:
                    for t in targets:
                        if t.get("type") == "page":
                            ws_url = t.get("webSocketDebuggerUrl")
                            break
                if ws_url:
                    break
            except Exception:
                time.sleep(0.5)

        async with websockets.connect(ws_url, max_size=50_000_000) as ws:
            msg_id = [0]
            async def send(method, params=None):
                msg_id[0] += 1
                mid = msg_id[0]
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == mid:
                        return resp.get("result", {})

            await send("Page.enable")
            await send("Runtime.enable")
            await send("DOM.enable")

            # Open modal
            await send("Runtime.evaluate", {
                "expression": """
                (() => {
                    if (window.finishIntro) window.finishIntro();
                    const overlay = document.getElementById("rx-intro-overlay");
                    if (overlay) overlay.remove();
                    const root = document.getElementById("root");
                    if (root) {
                        root.classList.add("rx-root-revealed");
                        root.style.setProperty("display", "block", "important");
                        root.style.setProperty("opacity", "1", "important");
                    }
                    window.location.hash = "#inspect=C-04009";
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                })()
                """
            })
            await asyncio.sleep(2.0)

            for name, w, h in VIEWPORTS:
                await send("Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": w <= 768
                })
                await asyncio.sleep(0.5)

                metrics = await send("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const header = document.querySelector('.modal-header');
                        const tabStrip = document.querySelector('.dossier-tab-strip');
                        const body = document.querySelector('.modal-body');
                        const firstCard = body ? body.querySelector('.card') : null;
                        const tRect = tabStrip ? tabStrip.getBoundingClientRect() : null;
                        const bRect = body ? body.getBoundingClientRect() : null;
                        const cRect = firstCard ? firstCard.getBoundingClientRect() : null;
                        return {
                            tabBottom: tRect ? tRect.bottom : null,
                            tabHeight: tRect ? tRect.height : null,
                            bodyTop: bRect ? bRect.top : null,
                            firstCardTop: cRect ? cRect.top : null,
                            tabVsBodyOverlap: (tRect && bRect) ? Math.round(tRect.bottom - bRect.top) : null,
                            tabVsCardOverlap: (tRect && cRect) ? Math.round(tRect.bottom - cRect.top) : null
                        };
                    })()
                    """,
                    "returnByValue": True
                })
                print(f"Viewport {name} ({w}x{h}):", json.dumps(metrics.get("result", {}).get("value", {}), indent=2))

                shot = await send("Page.captureScreenshot", {"format": "png"})
                shot_path = os.path.join(ARTIFACT_DIR, f"modal_{name}.png")
                with open(shot_path, "wb") as f:
                    f.write(base64.b64decode(shot["data"]))
                print(f"  Screenshot saved to: {shot_path}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(inspect())
