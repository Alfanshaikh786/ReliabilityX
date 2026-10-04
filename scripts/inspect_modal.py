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

        await send("Page.reload", {"ignoreCache": True})
        await asyncio.sleep(1.0)

        # Open component modal for C-01008 by setting location hash or clicking search
        await send("Runtime.evaluate", {
            "expression": """
                (() => {
                    const overlay = document.getElementById("rx-intro-overlay");
                    if (overlay) overlay.remove();
                    const video = document.getElementById("rx-intro-video");
                    if (video) { video.pause(); video.remove(); }
                    const root = document.getElementById("root");
                    if (root) {
                        root.classList.add("rx-root-revealed");
                        root.style.opacity = "1";
                    }
                    if (window.finishIntro) window.finishIntro();
                    window.location.hash = "#inspect=C-01008";
                })()
            """
        })
        await asyncio.sleep(1.5)

        # Desktop 1440
        await send("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 900,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        await asyncio.sleep(0.5)

        res = await send("Runtime.evaluate", {
            "expression": """(() => {
                const overlay = document.querySelector('.modal-overlay');
                const card = document.querySelector('.modal-card');
                const header = document.querySelector('.modal-header');
                const tabStrip = document.querySelector('.dossier-tab-strip');
                const body = document.querySelector('.modal-body');
                const firstCard = body ? body.querySelector('.card') : null;
                
                function getInfo(el) {
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cs = window.getComputedStyle(el);
                    return {
                        rect: { top: r.top, bottom: r.bottom, height: r.height, left: r.left, width: r.width },
                        position: cs.position,
                        top: cs.top,
                        marginTop: cs.marginTop,
                        marginBottom: cs.marginBottom,
                        overflow: cs.overflow,
                        overflowY: cs.overflowY,
                        zIndex: cs.zIndex,
                        transform: cs.transform
                    };
                }

                return {
                    overlay: getInfo(overlay),
                    card: getInfo(card),
                    header: getInfo(header),
                    tabStrip: getInfo(tabStrip),
                    body: getInfo(body),
                    firstCard: getInfo(firstCard),
                    tabStripBottom: tabStrip ? tabStrip.getBoundingClientRect().bottom : null,
                    bodyTop: body ? body.getBoundingClientRect().top : null,
                    firstCardTop: firstCard ? firstCard.getBoundingClientRect().top : null
                };
            })()""",
            "returnByValue": True
        })
        print("Modal Layout Debug:", json.dumps(res["result"]["value"], indent=2))

        # Screenshot of the modal
        shot = await send("Page.captureScreenshot", {"format": "png"})
        p = os.path.join(ARTIFACT_DIR, "modal_overlap_debug.png")
        with open(p, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print("Saved modal screenshot to:", p)

asyncio.run(test())
