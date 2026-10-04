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

        # Reload with ignoreCache to load newly compiled CSS and JS bundle
        await send("Page.reload", {"ignoreCache": True})
        await asyncio.sleep(1.0)

        # Switch to dashboard and unmask root
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

        # 1. Desktop 1440
        await send("Emulation.setDeviceMetricsOverride", {
            "width": 1440,
            "height": 900,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        await asyncio.sleep(0.4)

        metrics_desk = await send("Runtime.evaluate", {
            "expression": """
                (() => {
                    const hero = document.getElementById("section-overview-header");
                    const searchBar = document.querySelector(".dashboard-search-container");
                    const benchPill = document.querySelector(".dashboard-dataset-pill");
                    const searchRect = searchBar ? searchBar.getBoundingClientRect() : null;
                    const benchRect = benchPill ? benchPill.getBoundingClientRect() : null;
                    const heroRect = hero ? hero.getBoundingClientRect() : null;
                    return {
                        heroHeight: heroRect ? Math.round(heroRect.height) : 0,
                        heroWidth: heroRect ? Math.round(heroRect.width) : 0,
                        searchLeft: searchRect ? Math.round(searchRect.left) : 0,
                        searchRight: searchRect ? Math.round(searchRect.right) : 0,
                        benchLeft: benchRect ? Math.round(benchRect.left) : 0,
                        benchRight: benchRect ? Math.round(benchRect.right) : 0,
                        gapBetweenSearchAndBench: (searchRect && benchRect) ? Math.round(benchRect.left - searchRect.right) : null
                    };
                })()
            """,
            "returnByValue": True
        })
        print("Desktop Metrics:", json.dumps(metrics_desk["result"]["value"], indent=2))

        # Capture desktop screenshot
        res_d = await send("Page.captureScreenshot", {"format": "png"})
        p_d = os.path.join(ARTIFACT_DIR, "dashboard_updated_desktop.png")
        with open(p_d, "wb") as f:
            f.write(base64.b64decode(res_d["data"]))
        print("Saved desktop screenshot to:", p_d)

        # 2. Mobile 390
        await send("Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 2,
            "mobile": True
        })
        await asyncio.sleep(0.4)

        metrics_mob = await send("Runtime.evaluate", {
            "expression": """
                (() => {
                    const hero = document.getElementById("section-overview-header");
                    const heroRect = hero ? hero.getBoundingClientRect() : null;
                    const sw = document.documentElement.scrollWidth;
                    const cw = document.documentElement.clientWidth;
                    return {
                        heroHeight: heroRect ? Math.round(heroRect.height) : 0,
                        hasHScroll: sw > cw + 1,
                        scrollWidth: sw,
                        clientWidth: cw
                    };
                })()
            """,
            "returnByValue": True
        })
        print("Mobile Metrics:", json.dumps(metrics_mob["result"]["value"], indent=2))

        res_m = await send("Page.captureScreenshot", {"format": "png"})
        p_m = os.path.join(ARTIFACT_DIR, "dashboard_updated_mobile.png")
        with open(p_m, "wb") as f:
            f.write(base64.b64decode(res_m["data"]))
        print("Saved mobile screenshot to:", p_m)

        await send("Emulation.clearDeviceMetricsOverride")

asyncio.run(test())
