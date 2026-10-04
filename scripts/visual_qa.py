import asyncio
import json
import os
import subprocess
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\3f0279dc-1166-43b5-911d-eec85cf40f5f"

VIEWPORTS = [
    ("desktop_1440x900", 1440, 900),
    ("tablet_1024x768", 1024, 768),
    ("mobile_390x844", 390, 844),
    ("mobile_360x800", 360, 800)
]

async def cdp_command(ws, method, params=None, msg_id=[1]):
    mid = msg_id[0]
    msg_id[0] += 1
    payload = {"id": mid, "method": method, "params": params or {}}
    await ws.send(json.dumps(payload))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == mid:
            return data.get("result", {})

async def run_visual_qa():
    # 1. Start Chrome with remote debugging
    port = 9234
    user_data_dir = os.path.join(ARTIFACT_DIR, "scratch", "chrome_qa_profile")
    os.makedirs(user_data_dir, exist_ok=True)
    
    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={user_data_dir}",
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "http://127.0.0.1:8000/#hardware_connectivity"
    ]
    proc = subprocess.Popen(cmd)
    print(f"[Visual QA] Started Chrome headless on port {port} (PID {proc.pid})")
    
    try:
        # Wait for debugging port
        ws_url = None
        for _ in range(30):
            try:
                res = urllib.request.urlopen(f"http://127.0.0.1:{port}/json")
                targets = json.loads(res.read())
                for t in targets:
                    if t.get("type") == "page":
                        ws_url = t.get("webSocketDebuggerUrl")
                        break
                if ws_url:
                    break
            except Exception:
                time.sleep(0.5)
                
        if not ws_url:
            raise RuntimeError("Could not obtain Chrome WebSocket URL")
            
        print(f"[Visual QA] Connected to CDP: {ws_url}")
        
        async with websockets.connect(ws_url, max_size=50_000_000) as ws:
            # Enable runtime and page
            await cdp_command(ws, "Page.enable")
            await cdp_command(ws, "Runtime.enable")
            await cdp_command(ws, "DOM.enable")
            
            # Wait 2 seconds for initial React render
            await asyncio.sleep(2)
            
            # Dismiss intro video if present
            dismiss_js = """
            (() => {
                if (typeof finishIntro === 'function') {
                    finishIntro();
                }
                const overlay = document.getElementById('rx-intro-overlay');
                if (overlay) overlay.remove();
                const root = document.querySelector('.rx-root-container');
                if (root) root.classList.add('rx-root-revealed');
                
                // Ensure Hardware Connectivity tab is active
                const hwTabBtn = Array.from(document.querySelectorAll('.sidebar-nav-item, .mobile-nav-item'))
                    .find(el => el.textContent.includes('Hardware'));
                if (hwTabBtn) hwTabBtn.click();
                
                return {
                    title: document.title,
                    hasHeader: !!document.querySelector('.hw-page-header'),
                    hasConsole: !!document.querySelector('.hw-console-container')
                };
            })()
            """
            eval_res = await cdp_command(ws, "Runtime.evaluate", {"expression": dismiss_js, "returnByValue": True})
            print(f"[Visual QA] Dismiss Intro & Mount Tab result: {eval_res}")
            
            # Wait 1s for layout to settle
            await asyncio.sleep(1)
            
            # Check layout for each viewport
            for name, w, h in VIEWPORTS:
                print(f"\n--- Testing Viewport {name} ({w}x{h}) ---")
                
                # Set device metrics
                await cdp_command(ws, "Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": (w <= 768)
                })
                await asyncio.sleep(0.5)
                
                # Inspect DOM bounding boxes
                metrics_js = """
                (() => {
                    const header = document.querySelector('.hw-page-header');
                    const row1 = document.querySelector('.hw-header-row-1');
                    const row2 = document.querySelector('.hw-header-row-2');
                    const row3 = document.querySelector('.hw-header-row-3');
                    const badges = document.querySelector('.hw-header-badges');
                    const topbar = document.querySelector('.app-topbar');
                    const container = document.querySelector('.hw-console-container');
                    const overviewGrid = document.querySelector('.hw-overview-grid');
                    const controlCard = document.querySelector('.hw-control-card');
                    
                    const rect = el => el ? {
                        top: Math.round(el.getBoundingClientRect().top),
                        bottom: Math.round(el.getBoundingClientRect().bottom),
                        left: Math.round(el.getBoundingClientRect().left),
                        right: Math.round(el.getBoundingClientRect().right),
                        width: Math.round(el.getBoundingClientRect().width),
                        height: Math.round(el.getBoundingClientRect().height)
                    } : null;
                    
                    // Check for overlap between row1, row2, row3, and badges
                    const row2Rect = rect(row2);
                    const badgesRect = rect(badges);
                    const topbarRect = rect(topbar);
                    const headerRect = rect(header);
                    
                    const scrollW = document.documentElement.scrollWidth;
                    const innerW = window.innerWidth;
                    
                    return {
                        viewportWidth: innerW,
                        viewportHeight: window.innerHeight,
                        scrollWidth: scrollW,
                        hasHorizontalOverflow: scrollW > innerW + 1,
                        topbarHeight: topbarRect ? topbarRect.height : 0,
                        headerHeight: headerRect ? headerRect.height : 0,
                        headerRect: headerRect,
                        row2Rect: row2Rect,
                        badgesRect: badgesRect,
                        overviewHeight: rect(overviewGrid) ? rect(overviewGrid).height : 0,
                        controlHeight: rect(controlCard) ? rect(controlCard).height : 0,
                        containerHeight: rect(container) ? rect(container).height : 0
                    };
                })()
                """
                layout_info = await cdp_command(ws, "Runtime.evaluate", {"expression": metrics_js, "returnByValue": True})
                val = layout_info.get("result", {}).get("value", {})
                print(f"Metrics: {json.dumps(val, indent=2)}")
                
                # Capture screenshot
                shot = await cdp_command(ws, "Page.captureScreenshot", {"format": "png"})
                if shot.get("data"):
                    import base64
                    img_data = base64.b64decode(shot["data"])
                    shot_path = os.path.join(ARTIFACT_DIR, f"qa_{name}.png")
                    with open(shot_path, "wb") as f:
                        f.write(img_data)
                    print(f"Saved screenshot: {shot_path} ({len(img_data)} bytes)")
                    
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()
        print("[Visual QA] Finished Chrome run.")

if __name__ == "__main__":
    asyncio.run(run_visual_qa())
