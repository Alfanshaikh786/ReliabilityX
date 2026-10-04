import asyncio
import base64
import json
import os
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\449ccba3-deb9-4397-9d83-3fba0fe274e9"

async def test():
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
        targets = json.loads(r.read())
    t = [x for x in targets if "8000" in x.get("url", "") and x.get("type") == "page"][0]
    
    async with websockets.connect(t["webSocketDebuggerUrl"]) as ws:
        async def send(method, params=None):
            await ws.send(json.dumps({"id": 1, "method": method, "params": params or {}}))
            while True:
                d = json.loads(await ws.recv())
                if d.get("id") == 1:
                    return d.get("result", {})

        # Mobile 390
        await send("Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 2,
            "mobile": True
        })
        await asyncio.sleep(0.5)

        res_mob = await send("Runtime.evaluate", {
            "expression": """(() => {
                const tabStrip = document.querySelector('.dossier-tab-strip');
                const body = document.querySelector('.modal-body');
                const tRect = tabStrip ? tabStrip.getBoundingClientRect() : null;
                const bRect = body ? body.getBoundingClientRect() : null;
                return {
                    tabHeight: tRect ? tRect.height : 0,
                    tabBottom: tRect ? tRect.bottom : 0,
                    bodyTop: bRect ? bRect.top : 0,
                    gap: (tRect && bRect) ? (bRect.top - tRect.bottom) : null
                };
            })()""",
            "returnByValue": True
        })
        print("Mobile Modal Debug:", json.dumps(res_mob["result"]["value"], indent=2))

        shot_mob = await send("Page.captureScreenshot", {"format": "png"})
        p_mob = os.path.join(ARTIFACT_DIR, "modal_mobile_fixed.png")
        with open(p_mob, "wb") as f:
            f.write(base64.b64decode(shot_mob["data"]))
        print("Saved mobile modal screenshot to:", p_mob)

        await send("Emulation.clearDeviceMetricsOverride")

asyncio.run(test())
