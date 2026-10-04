import asyncio
import base64
import json
import os
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\449ccba3-deb9-4397-9d83-3fba0fe274e9"

SECTIONS = [
    ("inspection", "Inspection Priority"),
    ("dashboard", "Dashboard"),
    ("screening", "Screening Pipeline"),
    ("components", "Components Directory"),
    ("lots", "Lot Health"),
    ("predictions", "168h Forecasts"),
    ("live_telemetry", "Live Screening"),
    ("hardware_connectivity", "Hardware Connectivity"),
    ("engineering", "Engineering Suite"),
    ("audit", "Audit Suite"),
    ("reports", "Reports"),
    ("about", "About ReliabilityX")
]

async def send_cmd(ws, method, params=None, msg_id=1):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def audit():
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
    async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
        # Load fresh page
        await send_cmd(ws, "Page.navigate", {"url": "http://127.0.0.1:8000/?v=audit3#inspection"}, 1)
        await asyncio.sleep(1.0)

        # Force unmask root and clear video overlay immediately
        await send_cmd(ws, "Runtime.evaluate", {
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
                        root.style.visibility = "visible";
                    }
                    if (window.finishIntro) window.finishIntro();
                    window.dispatchEvent(new CustomEvent("rx-intro-complete"));
                })()
            """
        }, 2)
        await asyncio.sleep(1.0)

        report = {}
        for tab_id, name in SECTIONS:
            # Switch tab
            await send_cmd(ws, "Runtime.evaluate", {
                "expression": f"""
                (() => {{
                    window.location.hash = '{tab_id}';
                    const root = document.getElementById("root");
                    if (root) {{
                        root.classList.add("rx-root-revealed");
                        root.style.opacity = "1";
                    }}
                }})()
                """
            }, 30)
            await asyncio.sleep(0.5)

            # Ensure hero settled
            await send_cmd(ws, "Runtime.evaluate", {
                "expression": "document.querySelectorAll('.about-hero-intro').forEach(el => el.classList.add('rx-settled-in'));"
            }, 31)

            # Desktop 1440
            await send_cmd(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            }, 32)
            await asyncio.sleep(0.3)

            eval_res = await send_cmd(ws, "Runtime.evaluate", {
                "expression": """
                (() => {
                    const hero = document.querySelector('.about-hero-intro');
                    const scrollWidth = document.documentElement.scrollWidth;
                    const clientWidth = document.documentElement.clientWidth;
                    const hasHScroll = scrollWidth > clientWidth;
                    let nextElDist = null;
                    let heroRect = null;
                    if (hero) {
                        heroRect = hero.getBoundingClientRect();
                        const nextEl = hero.nextElementSibling;
                        if (nextEl) {
                            const nextRect = nextEl.getBoundingClientRect();
                            nextElDist = Math.round(nextRect.top - heroRect.bottom);
                        }
                    }
                    return {
                        hasHero: !!hero,
                        heroHeight: heroRect ? Math.round(heroRect.height) : 0,
                        heroWidth: heroRect ? Math.round(heroRect.width) : 0,
                        nextElDist,
                        hasHScroll,
                        scrollWidth,
                        clientWidth
                    };
                })()
                """,
                "returnByValue": True
            }, 33)
            report[f"{tab_id}_desktop_1440"] = eval_res.get("result", {}).get("value", {})

            # Capture desktop screenshot
            res_d = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"}, 34)
            p_d = os.path.join(ARTIFACT_DIR, f"section_{tab_id}_desktop.png")
            with open(p_d, "wb") as f:
                f.write(base64.b64decode(res_d["data"]))

            # Mobile 390
            await send_cmd(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            }, 35)
            await asyncio.sleep(0.3)

            eval_mob = await send_cmd(ws, "Runtime.evaluate", {
                "expression": """
                (() => {
                    const hero = document.querySelector('.about-hero-intro');
                    const scrollWidth = document.documentElement.scrollWidth;
                    const clientWidth = document.documentElement.clientWidth;
                    const hasHScroll = scrollWidth > clientWidth + 1;
                    let nextElDist = null;
                    let heroRect = null;
                    if (hero) {
                        heroRect = hero.getBoundingClientRect();
                        const nextEl = hero.nextElementSibling;
                        if (nextEl) {
                            const nextRect = nextEl.getBoundingClientRect();
                            nextElDist = Math.round(nextRect.top - heroRect.bottom);
                        }
                    }
                    return {
                        hasHero: !!hero,
                        heroHeight: heroRect ? Math.round(heroRect.height) : 0,
                        nextElDist,
                        hasHScroll,
                        scrollWidth,
                        clientWidth
                    };
                })()
                """,
                "returnByValue": True
            }, 36)
            report[f"{tab_id}_mobile_390"] = eval_mob.get("result", {}).get("value", {})

            # Capture mobile screenshot
            res_m = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"}, 37)
            p_m = os.path.join(ARTIFACT_DIR, f"section_{tab_id}_mobile.png")
            with open(p_m, "wb") as f:
                f.write(base64.b64decode(res_m["data"]))

            # Mobile 320
            await send_cmd(ws, "Emulation.setDeviceMetricsOverride", {
                "width": 320,
                "height": 640,
                "deviceScaleFactor": 2,
                "mobile": True
            }, 38)
            await asyncio.sleep(0.1)
            eval_320 = await send_cmd(ws, "Runtime.evaluate", {
                "expression": """
                (() => {
                    const scrollWidth = document.documentElement.scrollWidth;
                    const clientWidth = document.documentElement.clientWidth;
                    return {
                        hasHScroll: scrollWidth > clientWidth + 1,
                        scrollWidth,
                        clientWidth
                    };
                })()
                """,
                "returnByValue": True
            }, 39)
            report[f"{tab_id}_mobile_320"] = eval_320.get("result", {}).get("value", {})

        print("\n--- AUDIT RESULTS FOR ALL 12 SECTIONS ---")
        print(json.dumps(report, indent=2))

        # Reset Emulation
        await send_cmd(ws, "Emulation.clearDeviceMetricsOverride", {}, 99)

asyncio.run(audit())
