import asyncio
import base64
import json
import os
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\7d09a8c5-630f-4784-a140-e86755c522ff"

SECTIONS = [
    ("dashboard", "header_section_1_dashboard.png"),
    ("screening", "header_section_2_screening.png"),
    ("components", "header_section_3_components.png"),
    ("lots", "header_section_4_lots.png"),
    ("predictions", "header_section_5_predictions.png"),
    ("live_telemetry", "header_section_6_live_telemetry.png"),
    ("hardware_connectivity", "header_section_7_hardware.png"),
]

async def capture_all():
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
        targets = json.loads(r.read().decode())
    target = [t for t in targets if t.get("type") == "page" and "8000" in t.get("url", "")][0]
    
    async with websockets.connect(target["webSocketDebuggerUrl"], max_size=25_000_000) as ws:
        async def cmd(m, p=None):
            await ws.send(json.dumps({"id": 1, "method": m, "params": p or {}}))
            while True:
                r = json.loads(await ws.recv())
                if r.get("id") == 1:
                    return r.get("result", {})
        async def eval_js(expr):
            res = await cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
            return res.get("result", {}).get("value")
        
        await cmd("Page.enable")
        await cmd("Runtime.enable")
        await cmd("Emulation.clearDeviceMetricsOverride")
        await cmd("Page.reload", {"ignoreCache": True})
        await asyncio.sleep(2.5)

        await eval_js("""(() => {
            const ov = document.getElementById('rx-intro-overlay');
            if (ov) ov.remove();
            const root = document.getElementById('root');
            if (root) {
                root.style.display = 'block';
                root.classList.add('rx-root-revealed');
            }
        })()""")
        await asyncio.sleep(0.5)

        for tab_id, filename in SECTIONS:
            await eval_js(f"""(() => {{
                window.location.hash = '#{tab_id}';
                const vp = document.querySelector('.app-main-viewport');
                if (vp) vp.scrollTo({{ top: 0, behavior: 'instant' }});
            }})()""")
            await asyncio.sleep(0.8)
            
            res = await cmd("Page.captureScreenshot", {"format": "png"})
            out_path = os.path.join(ARTIFACT_DIR, filename)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print(f"Captured desktop {tab_id} -> {filename}")

        # Also capture mobile view for dashboard and hardware connectivity
        await cmd("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
        await asyncio.sleep(0.5)
        
        for tab_id, filename in [("dashboard", "header_mobile_1_dashboard.png"), ("hardware_connectivity", "header_mobile_7_hardware.png")]:
            await eval_js(f"""(() => {{
                window.location.hash = '#{tab_id}';
                const vp = document.querySelector('.app-main-viewport');
                if (vp) vp.scrollTo({{ top: 0, behavior: 'instant' }});
            }})()""")
            await asyncio.sleep(0.8)
            res = await cmd("Page.captureScreenshot", {"format": "png"})
            out_path = os.path.join(ARTIFACT_DIR, filename)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print(f"Captured mobile {tab_id} -> {filename}")

        await cmd("Emulation.clearDeviceMetricsOverride")
        # Leave page on dashboard
        await eval_js("window.location.hash = '#dashboard';")
        print("Done capturing all screenshots!")

if __name__ == "__main__":
    asyncio.run(capture_all())
