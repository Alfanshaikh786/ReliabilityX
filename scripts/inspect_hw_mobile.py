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
    port = 9270
    user_data_dir = os.path.join(ARTIFACT_DIR, "scratch", "chrome_hw_mobile_4")
    os.makedirs(user_data_dir, exist_ok=True)

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://127.0.0.1:8000/?nointro=1#hardware_connectivity"
    ]
    proc = subprocess.Popen(cmd)
    print(f"Started Chrome headless on port {port} (PID {proc.pid})")

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

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome CDP")

        print(f"Connected to CDP: {ws_url}")
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

            # Set mobile viewport 390x844 (iPhone 12/13/14 geometry)
            await send("Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            })

            await asyncio.sleep(2.0)

            # Ensure hardware connectivity is selected and settled
            ensure_tab_js = """
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
                window.location.hash = "#hardware_connectivity";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
                document.querySelectorAll('.about-hero-intro').forEach(el => el.classList.add('rx-settled-in'));

                const pills = Array.from(document.querySelectorAll('.hw-status-pill'));
                const hero = document.querySelector('.about-hero-intro');
                if (hero) hero.scrollIntoView({ block: 'start' });
                return {
                    pillCount: pills.length,
                    hasHero: !!hero
                };
            })()
            """
            init_res = await send("Runtime.evaluate", {"expression": ensure_tab_js, "returnByValue": True})
            print("Tab Init Result:", json.dumps(init_res, indent=2))

            await asyncio.sleep(1.0)

            # Measure geometry
            measure_js = """
            (() => {
                const bar = document.querySelector('.hw-header-badges-bar');
                const pills = Array.from(document.querySelectorAll('.hw-header-badges-bar .hw-status-pill, .hw-status-pill'));
                const hero = document.querySelector('.about-hero-intro');
                const container = document.querySelector('.hw-console-container');
                return {
                    viewportWidth: window.innerWidth,
                    containerWidth: container ? Math.round(container.getBoundingClientRect().width) : null,
                    heroWidth: hero ? Math.round(hero.getBoundingClientRect().width) : null,
                    barWidth: bar ? Math.round(bar.getBoundingClientRect().width) : null,
                    pills: pills.map(p => {
                        const r = p.getBoundingClientRect();
                        return {
                            text: p.innerText.replace(/\\s+/g, ' ').trim(),
                            width: Math.round(r.width),
                            height: Math.round(r.height),
                            left: Math.round(r.left),
                            right: Math.round(r.right),
                            top: Math.round(r.top)
                        };
                    })
                };
            })()
            """
            metrics = await send("Runtime.evaluate", {"expression": measure_js, "returnByValue": True})
            print("Metrics:", json.dumps(metrics.get("result", {}).get("value", {}), indent=2))

            # Take screenshot
            shot = await send("Page.captureScreenshot", {"format": "png"})
            shot_file = os.path.join(ARTIFACT_DIR, "hardware_mobile_status_fixed.png")
            with open(shot_file, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print(f"Screenshot saved to: {shot_file}")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    asyncio.run(inspect())
