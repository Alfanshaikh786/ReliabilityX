import asyncio
import json
import urllib.request
import websockets

async def test_widths():
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

        await send("Runtime.evaluate", {
            "expression": 'window.location.hash = "#inspection"; document.getElementById("root")?.classList.add("rx-root-revealed");'
        })
        await asyncio.sleep(0.5)

        mob_widths = [320, 360, 375, 390, 412]
        desk_widths = [1024, 1280, 1440, 1920]

        print("--- MOBILE WIDTH AUDIT (INSPECTION) ---")
        for w in mob_widths:
            await send("Emulation.setDeviceMetricsOverride", {
                "width": w,
                "height": 800,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            await asyncio.sleep(0.2)
            res = await send("Runtime.evaluate", {
                "expression": """({
                    w: window.innerWidth,
                    sw: document.documentElement.scrollWidth,
                    cw: document.documentElement.clientWidth,
                    heroH: document.querySelector('.about-hero-intro')?.offsetHeight
                })""",
                "returnByValue": True
            })
            v = res["result"]["value"]
            has_scroll = v["sw"] > v["cw"] + 1
            print(f"Width {w}px: scrollWidth={v['sw']}, clientWidth={v['cw']}, heroH={v['heroH']}, hasHScroll={has_scroll}")

        print("\n--- DESKTOP WIDTH AUDIT (INSPECTION) ---")
        for w in desk_widths:
            await send("Emulation.setDeviceMetricsOverride", {
                "width": w,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })
            await asyncio.sleep(0.2)
            res = await send("Runtime.evaluate", {
                "expression": """({
                    w: window.innerWidth,
                    sw: document.documentElement.scrollWidth,
                    cw: document.documentElement.clientWidth,
                    heroH: document.querySelector('.about-hero-intro')?.offsetHeight
                })""",
                "returnByValue": True
            })
            v = res["result"]["value"]
            has_scroll = v["sw"] > v["cw"] + 1
            print(f"Width {w}px: scrollWidth={v['sw']}, clientWidth={v['cw']}, heroH={v['heroH']}, hasHScroll={has_scroll}")

        await send("Emulation.clearDeviceMetricsOverride")

asyncio.run(test_widths())
