import asyncio
import json
import urllib.request
import websockets

async def check():
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
        targets = json.loads(r.read().decode())
    target = [t for t in targets if t.get("type") == "page" and "8000" in t.get("url", "")][0]
    ws_url = target["webSocketDebuggerUrl"]

    async with websockets.connect(ws_url) as ws:
        async def cmd(m, p=None):
            await ws.send(json.dumps({"id": 1, "method": m, "params": p or {}}))
            while True:
                r = json.loads(await ws.recv())
                if r.get("id") == 1:
                    return r.get("result", {})
        async def eval_js(expr):
            res = await cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
            return res.get("result", {}).get("value")
        
        await cmd("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
        
        for tab in ["dashboard", "screening", "components", "lots", "predictions", "live_telemetry", "hardware_connectivity"]:
            await eval_js(f"window.location.hash = '#{tab}';")
            await asyncio.sleep(0.8)
            res = await eval_js("""
                (() => {
                    const vp = document.querySelector('.app-main-viewport');
                    const main = document.querySelector('.app-content');
                    const header = document.querySelector('.section-header');
                    return {
                        vp_scrollHeight: vp ? vp.scrollHeight : null,
                        vp_clientHeight: vp ? vp.clientHeight : null,
                        main_offsetHeight: main ? main.offsetHeight : null,
                        header_height: header ? header.offsetHeight : null,
                        main_display: main ? window.getComputedStyle(main).display : null,
                        main_first_child: main && main.firstElementChild ? {
                            tag: main.firstElementChild.tagName,
                            className: main.firstElementChild.className,
                            offsetHeight: main.firstElementChild.offsetHeight,
                            scrollHeight: main.firstElementChild.scrollHeight
                        } : null
                    };
                })()
            """)
            print(f"{tab}: {res}")
            
        await cmd("Emulation.clearDeviceMetricsOverride", {})

if __name__ == "__main__":
    asyncio.run(check())
