import asyncio
import base64
import json
import os
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\449ccba3-deb9-4397-9d83-3fba0fe274e9"

async def send_cmd(ws, method, params=None, msg_id=1):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def capture():
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
        targets = json.loads(r.read().decode())
    
    target = None
    for t in targets:
        if "8000" in t.get("url", "") and t.get("type") == "page":
            target = t
            break
    if not target:
        print("No target found!")
        return

    ws_url = target["webSocketDebuggerUrl"]
    print("Connecting to:", ws_url)
    async with websockets.connect(ws_url, max_size=20*1024*1024) as ws:
        # Navigate to fresh URL to load latest app bundle
        await send_cmd(ws, "Page.navigate", {"url": "http://127.0.0.1:8000/?v=latest#dashboard"}, 1)
        await asyncio.sleep(1.5)

        # Immediately dismiss intro video
        await send_cmd(ws, "Runtime.evaluate", {
            "expression": """
                try {
                    if (window.finishIntro) window.finishIntro();
                    const v = document.getElementById("intro-video");
                    if (v) { v.pause(); v.remove(); }
                    const s = document.getElementById("intro-splash");
                    if (s) s.remove();
                } catch(e) {}
            """
        }, 2)
        await asyncio.sleep(2.0)

        # Ensure hero is settled
        await send_cmd(ws, "Runtime.evaluate", {
            "expression": """
                document.querySelectorAll('.about-hero-intro').forEach(el => el.classList.add('rx-settled-in'));
            """
        }, 3)
        await asyncio.sleep(0.5)

        # Capture Desktop Screenshot
        res = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"}, 3)
        desktop_path = os.path.join(ARTIFACT_DIR, "dashboard_exact_desktop.png")
        with open(desktop_path, "wb") as f:
            f.write(base64.b64decode(res["data"]))
        print("Desktop screenshot saved to:", desktop_path)

        # Emulate Mobile Viewport (iPhone 14 / Pixel: 390x844)
        await send_cmd(ws, "Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 2,
            "mobile": True
        }, 4)
        await asyncio.sleep(1.0)

        res_mob = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"}, 5)
        mob_path = os.path.join(ARTIFACT_DIR, "dashboard_exact_mobile.png")
        with open(mob_path, "wb") as f:
            f.write(base64.b64decode(res_mob["data"]))
        print("Mobile screenshot saved to:", mob_path)

        # Reset Emulation
        await send_cmd(ws, "Emulation.clearDeviceMetricsOverride", {}, 6)

asyncio.run(capture())
