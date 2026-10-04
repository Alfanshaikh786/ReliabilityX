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

        await send("Runtime.evaluate", {
            "expression": """
                (() => {
                    window.location.hash = "#dashboard";
                    const root = document.getElementById("root");
                    if (root) {
                        root.classList.add("rx-root-revealed");
                        root.style.opacity = "1";
                    }
                    const overlay = document.getElementById("rx-intro-overlay");
                    if (overlay) overlay.remove();
                    const video = document.getElementById("rx-intro-video");
                    if (video) { video.pause(); video.remove(); }
                    if (window.finishIntro) window.finishIntro();
                    document.querySelectorAll('.about-hero-intro').forEach(el => el.classList.add('rx-settled-in'));
                })()
            """
        })
        await asyncio.sleep(1.0)

        await send("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 900,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        await asyncio.sleep(0.3)

        res = await send("Runtime.evaluate", {
            "expression": """(() => {
                const h = document.querySelector('.trajectory-card-header');
                const title = h ? h.querySelector('.card-title') : null;
                const btnGroup = h ? h.querySelector('.chart-param-btn-group') : null;
                const legend = h ? h.querySelector('.chart-legend-clean') : null;
                const csH = h ? window.getComputedStyle(h) : null;
                const csTitle = title ? window.getComputedStyle(title) : null;
                const csBtns = btnGroup ? window.getComputedStyle(btnGroup) : null;
                const csLeg = legend ? window.getComputedStyle(legend) : null;
                const tRect = title ? title.getBoundingClientRect() : null;
                const bRect = btnGroup ? btnGroup.getBoundingClientRect() : null;
                return {
                    hRect: h ? h.getBoundingClientRect() : null,
                    gapBetweenTitleAndBtns: (tRect && bRect) ? Math.round(bRect.top - tRect.bottom) : null,
                    titleMB: csTitle ? csTitle.marginBottom : null,
                    hMB: csH ? csH.marginBottom : null,
                    legGap: csLeg ? csLeg.gap : null,
                    legRowGap: csLeg ? csLeg.rowGap : null
                };
            })()""",
            "returnByValue": True
        })
        print("Inspection Results:", json.dumps(res["result"]["value"], indent=2))

        # Capture Screenshot of the Trajectory Card area
        clip = await send("Runtime.evaluate", {
            "expression": """(() => {
                const el = document.getElementById("section-trajectory-simulation");
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return {
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    width: Math.round(r.width),
                    height: Math.min(Math.round(r.height), 220),
                    scale: 1
                };
            })()""",
            "returnByValue": True
        })
        clip_rect = clip["result"]["value"]
        if clip_rect:
            shot = await send("Page.captureScreenshot", {"format": "png", "clip": clip_rect})
            p = os.path.join(ARTIFACT_DIR, "trajectory_header_spacious.png")
            with open(p, "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Saved clip to:", p)

        # Full page screenshot
        full_shot = await send("Page.captureScreenshot", {"format": "png"})
        p_full = os.path.join(ARTIFACT_DIR, "dashboard_full_spacious.png")
        with open(p_full, "wb") as f:
            f.write(base64.b64decode(full_shot["data"]))
        print("Saved full page to:", p_full)

asyncio.run(test())
