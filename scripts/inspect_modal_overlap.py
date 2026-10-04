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

async def inspect():
    port = 9292
    user_data_dir = os.path.join(ARTIFACT_DIR, "scratch", "chrome_modal_verified")
    os.makedirs(user_data_dir, exist_ok=True)

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://127.0.0.1:8000/?nointro=1#predictions"
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

            # Set desktop viewport 1280x800
            await send("Emulation.setDeviceMetricsOverride", {
                "width": 1280,
                "height": 800,
                "deviceScaleFactor": 1,
                "mobile": False
            })
            await asyncio.sleep(1.0)

            # Navigate to predictions tab and open modal for C-04009
            open_js = """
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
            await send("Runtime.evaluate", {"expression": open_js})
            await asyncio.sleep(2.0)

            # Inspect elements
            measure_js = """
            (() => {
                const header = document.querySelector('.modal-header');
                const compTitle = document.querySelector('.modal-comp-id-title');
                const lotTag = document.querySelector('.modal-lot-tag');
                const tabStrip = document.querySelector('.dossier-tab-strip');
                const tabs = Array.from(document.querySelectorAll('.dossier-tab-btn'));
                const body = document.querySelector('.modal-body');
                const firstCard = body ? body.querySelector('.card') : null;

                const cRect = compTitle ? compTitle.getBoundingClientRect() : null;
                const lRect = lotTag ? lotTag.getBoundingClientRect() : null;
                const tRect = tabStrip ? tabStrip.getBoundingClientRect() : null;
                const bRect = body ? body.getBoundingClientRect() : null;
                const fcRect = firstCard ? firstCard.getBoundingClientRect() : null;

                return {
                    titleAndLotGap: (cRect && lRect) ? Math.round(lRect.left - cRect.right) : null,
                    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
                    tabStripHeight: tRect ? Math.round(tRect.height) : null,
                    tabStripBottom: tRect ? Math.round(tRect.bottom) : null,
                    bodyTop: bRect ? Math.round(bRect.top) : null,
                    firstCardTop: fcRect ? Math.round(fcRect.top) : null,
                    gapTabVsFirstCard: (tRect && fcRect) ? Math.round(fcRect.top - tRect.bottom) : null,
                    isOverlapping: (tRect && fcRect) ? (tRect.bottom > fcRect.top) : false,
                    tabsCount: tabs.length,
                    activeTab: document.querySelector('.dossier-tab-btn.active')?.innerText
                };
            })()
            """
            metrics = await send("Runtime.evaluate", {"expression": measure_js, "returnByValue": True})
            print("Modal Overlap Metrics:\n", json.dumps(metrics.get("result", {}).get("value", {}), indent=2))

            shot = await send("Page.captureScreenshot", {"format": "png"})
            shot_file = os.path.join(ARTIFACT_DIR, "modal_fixed_inspection.png")
            with open(shot_file, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print(f"Screenshot saved to: {shot_file}")

            # Also click the "Prediction" tab to test switching to prediction section inside the modal
            click_pred_js = """
            (() => {
                const tabs = Array.from(document.querySelectorAll('.dossier-tab-btn'));
                const predTab = tabs.find(t => t.innerText.trim() === 'Prediction');
                if (predTab) {
                    predTab.click();
                    return true;
                }
                return false;
            })()
            """
            clicked = await send("Runtime.evaluate", {"expression": click_pred_js, "returnByValue": True})
            print("Clicked Prediction tab:", clicked.get("result", {}).get("value"))
            await asyncio.sleep(0.5)

            shot2 = await send("Page.captureScreenshot", {"format": "png"})
            shot_file2 = os.path.join(ARTIFACT_DIR, "modal_fixed_prediction_tab.png")
            with open(shot_file2, "wb") as f:
                f.write(base64.b64decode(shot2["data"]))
            print(f"Screenshot saved to: {shot_file2}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(inspect())
