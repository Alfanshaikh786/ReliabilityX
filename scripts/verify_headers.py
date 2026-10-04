import asyncio
import base64
import json
import os
import urllib.request
import websockets

ARTIFACT_DIR = r"C:\Users\alfan\.gemini\antigravity-ide\brain\7d09a8c5-630f-4784-a140-e86755c522ff"

SECTIONS_TO_TEST = [
    ("dashboard", "Dashboard Overview", "RELIABILITYX / DASHBOARD"),
    ("screening", "Screening Pipeline", "RELIABILITYX / ANOMALY DETECTION"),
    ("components", "Components Directory", "RELIABILITYX / DOSSIER"),
    ("lots", "Lot Health & Anomaly Triage", "RELIABILITYX / LOTS"),
    ("predictions", "168h Prognostic Forecasts", "RELIABILITYX / PREDICTIONS"),
    ("live_telemetry", "Live Screening Telemetry", "RELIABILITYX / LIVE STREAM"),
    ("hardware_connectivity", "Hardware Connectivity", "RELIABILITYX / HARDWARE"),
]

EXCLUDED_SECTIONS = ["reports", "about", "audit", "engineering"]

async def send_cmd(ws, method, params=None, msg_id=1):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def eval_js(ws, expr, msg_id=100):
    res = await send_cmd(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True}, msg_id)
    return res.get("result", {}).get("value")

async def capture_screenshot(ws, filename, msg_id=200):
    res = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"}, msg_id)
    out_path = os.path.join(ARTIFACT_DIR, filename)
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(res["data"]))
    print(f"  [Screenshot Saved] -> {out_path}")
    return out_path

async def run_verification():
    print("=== RELIABILITYX NON-STICKY SECTION HEADER VERIFICATION ===")
    
    # Locate active Chrome page on port 9222
    with urllib.request.urlopen("http://127.0.0.1:9222/json") as r:
        targets = json.loads(r.read().decode())
    
    target = None
    for t in targets:
        if "8000" in t.get("url", "") and t.get("type") == "page":
            target = t
            break
    if not target:
        target = [t for t in targets if t.get("type") == "page"][0]
    
    ws_url = target["webSocketDebuggerUrl"]
    print(f"Connecting to CDP: {target['url']} ({target['id']})")

    async with websockets.connect(ws_url, max_size=25_000_000) as ws:
        mid = 1
        await send_cmd(ws, "Page.enable", {}, mid); mid += 1
        await send_cmd(ws, "Runtime.enable", {}, mid); mid += 1

        # Clear any prior emulation overrides
        await send_cmd(ws, "Emulation.clearDeviceMetricsOverride", {}, mid); mid += 1

        # Reload with ignoreCache to ensure newest bundle & CSS
        print("Reloading page with ignoreCache=True to ensure v2.1.7 assets...")
        await send_cmd(ws, "Page.reload", {"ignoreCache": True}, mid); mid += 1
        await asyncio.sleep(2.5)

        # Dismiss intro video overlay if present
        await eval_js(ws, """
            (() => {
                const overlay = document.getElementById('rx-intro-overlay');
                if (overlay) overlay.remove();
                const root = document.getElementById('root');
                if (root) {
                    root.style.display = 'block';
                    root.classList.add('rx-root-revealed');
                }
                const vp = document.querySelector('.app-main-viewport');
                if (vp) vp.scrollTo({ top: 0, behavior: 'instant' });
            })()
        """, mid); mid += 1
        await asyncio.sleep(1)

        print("\n--- 1. DESKTOP VIEWPORT: 7 SECTIONS HEADER & CONTROLS AUDIT ---")
        desktop_results = []
        metrics_comparison = []

        for tab_id, title_expected, breadcrumb_expected in SECTIONS_TO_TEST:
            # Switch tab via window.location.hash
            await eval_js(ws, f"""
                (() => {{
                    window.location.hash = '#{tab_id}';
                    const vp = document.querySelector('.app-main-viewport');
                    if (vp) vp.scrollTo({{ top: 0, behavior: 'instant' }});
                }})()
            """, mid); mid += 1
            await asyncio.sleep(0.8)

            info = await eval_js(ws, """
                (() => {
                    const h = document.querySelector('.section-header');
                    if (!h) return { found: false };
                    const style = window.getComputedStyle(h);
                    const rect = h.getBoundingClientRect();
                    const titleEl = h.querySelector('.section-header-title');
                    const breadcrumbEl = h.querySelector('.section-header-breadcrumb');
                    const sourcePill = h.querySelector('.data-source-provenance-pill');
                    const statusPill = h.querySelector('.live-topbar-pill');
                    const searchBox = h.querySelector('.section-header-search-box');
                    const searchInput = h.querySelector('.section-header-search-box input');
                    const datasetPill = h.querySelector('.dataset-pill');
                    const changeBtn = h.querySelector('.pill-action-btn');
                    const exportBtn = h.querySelector('.section-header-actions button:first-child');
                    const reloadBtn = h.querySelector('.section-header-actions button:last-child');
                    
                    return {
                        found: true,
                        position: style.position,
                        top_css: style.top,
                        padding: style.padding,
                        height: rect.height,
                        title: titleEl ? titleEl.textContent.trim() : null,
                        title_font_size: titleEl ? window.getComputedStyle(titleEl).fontSize : null,
                        breadcrumb: breadcrumbEl ? breadcrumbEl.textContent.trim() : null,
                        breadcrumb_font_size: breadcrumbEl ? window.getComputedStyle(breadcrumbEl).fontSize : null,
                        has_source_pill: !!sourcePill,
                        source_text: sourcePill ? sourcePill.textContent.trim() : null,
                        has_status_pill: !!statusPill,
                        status_text: statusPill ? statusPill.textContent.trim() : null,
                        has_search: !!searchBox && !!searchInput,
                        has_dataset: !!datasetPill,
                        has_change_btn: !!changeBtn,
                        dataset_text: datasetPill ? datasetPill.textContent.trim() : null,
                        has_export: !!exportBtn && exportBtn.textContent.includes('Export'),
                        has_reload: !!reloadBtn && reloadBtn.textContent.includes('Reload'),
                    };
                })()
            """, mid); mid += 1

            # Instant scroll test
            scroll_test = await eval_js(ws, """
                (() => {
                    const vp = document.querySelector('.app-main-viewport');
                    const h = document.querySelector('.section-header');
                    if (!vp || !h) return { error: 'viewport or header missing' };
                    
                    vp.scrollTo({ top: 0, behavior: 'instant' });
                    const topAtZero = h.getBoundingClientRect().top;
                    
                    vp.scrollTo({ top: 350, behavior: 'instant' });
                    const topAt350 = h.getBoundingClientRect().top;
                    const vpScrollTop = vp.scrollTop;
                    
                    // Reset scroll
                    vp.scrollTo({ top: 0, behavior: 'instant' });
                    
                    return {
                        topAtZero,
                        topAt350,
                        vpScrollTop,
                        scrolledAway: topAt350 < topAtZero && topAt350 < 0
                    };
                })()
            """, mid); mid += 1

            has_all_controls = (
                info.get("has_source_pill") and
                info.get("has_status_pill") and
                info.get("has_search") and
                info.get("has_dataset") and
                info.get("has_change_btn") and
                info.get("has_export") and
                info.get("has_reload")
            )

            is_non_sticky = (
                info.get("position") in ["relative", "static"] and
                scroll_test.get("scrolledAway", False)
            )

            title_matches = info.get("title") == title_expected

            metrics_comparison.append({
                "tab": tab_id,
                "height": round(info.get("height", 0), 1),
                "padding": info.get("padding"),
                "title_font": info.get("title_font_size"),
                "breadcrumb_font": info.get("breadcrumb_font_size")
            })

            desktop_results.append({
                "tab": tab_id,
                "title": info.get("title"),
                "title_matches": title_matches,
                "position": info.get("position"),
                "is_non_sticky": is_non_sticky,
                "controls_ok": has_all_controls,
                "scroll_detail": scroll_test
            })

            print(f"  [Desktop] Section '{tab_id}':")
            print(f"    Title: '{info.get('title')}' (expected: '{title_expected}') -> {title_matches}")
            print(f"    Position: '{info.get('position')}' | Non-Sticky Scrolled Away: {is_non_sticky} (top: {scroll_test.get('topAtZero')}px -> {scroll_test.get('topAt350')}px)")
            print(f"    Controls (Source, Status, Search, Dataset+Change, Export, Reload): {has_all_controls}")

        # Capture desktop screenshot
        await eval_js(ws, "window.location.hash = '#dashboard';", mid); mid += 1
        await asyncio.sleep(0.5)
        await capture_screenshot(ws, "verified_desktop_dashboard.png", mid); mid += 1

        print("\n--- 2. EXCLUDED SECTIONS AUDIT (Reports, About, Audit, Engineering) ---")
        excluded_results = []
        for ex in EXCLUDED_SECTIONS:
            await eval_js(ws, f"window.location.hash = '#{ex}';", mid); mid += 1
            await asyncio.sleep(0.6)
            check = await eval_js(ws, """
                (() => {
                    return {
                        has_section_header: !!document.querySelector('.section-header'),
                        has_topbar: !!document.querySelector('.app-topbar'),
                        has_safety_banner: !!document.querySelector('.safety-banner')
                    };
                })()
            """, mid); mid += 1
            is_clean = not check["has_section_header"] and not check["has_topbar"] and not check["has_safety_banner"]
            excluded_results.append((ex, is_clean))
            print(f"  [Excluded] Section '{ex}': Header & banner completely absent = {is_clean}")

        print("\n--- 3. MOBILE VIEWPORT AUDIT (390x844 iPhone Viewport) ---")
        await send_cmd(ws, "Emulation.setDeviceMetricsOverride", {
            "width": 390,
            "height": 844,
            "deviceScaleFactor": 2,
            "mobile": True
        }, mid); mid += 1
        await asyncio.sleep(1)

        mobile_results = []
        for tab_id, title_expected, _ in SECTIONS_TO_TEST:
            await eval_js(ws, f"""
                (() => {{
                    window.location.hash = '#{tab_id}';
                    const vp = document.querySelector('.app-main-viewport');
                    if (vp) vp.scrollTo({{ top: 0, behavior: 'instant' }});
                }})()
            """, mid); mid += 1
            await asyncio.sleep(0.8)

            m_info = await eval_js(ws, """
                (() => {
                    const h = document.querySelector('.section-header');
                    const vp = document.querySelector('.app-main-viewport');
                    if (!h || !vp) return { found: false };
                    
                    const style = window.getComputedStyle(h);
                    const menuBtn = h.querySelector('.section-header-menu-btn');
                    
                    vp.scrollTo({ top: 0, behavior: 'instant' });
                    const topAtZero = h.getBoundingClientRect().top;
                    
                    vp.scrollTo({ top: 300, behavior: 'instant' });
                    const topAt300 = h.getBoundingClientRect().top;
                    
                    vp.scrollTo({ top: 0, behavior: 'instant' });
                    
                    return {
                        found: true,
                        position: style.position,
                        scrollWidth: vp.scrollWidth,
                        clientWidth: vp.clientWidth,
                        hasHorizontalOverflow: vp.scrollWidth > vp.clientWidth,
                        hasMenuBtn: !!menuBtn,
                        topAtZero,
                        topAt300,
                        scrolledAway: topAt300 < topAtZero && topAt300 < 0
                    };
                })()
            """, mid); mid += 1

            mobile_results.append({
                "tab": tab_id,
                "position": m_info.get("position"),
                "overflow": m_info.get("hasHorizontalOverflow"),
                "scrolledAway": m_info.get("scrolledAway"),
                "menuBtn": m_info.get("hasMenuBtn"),
                "scrollWidth": m_info.get("scrollWidth"),
                "clientWidth": m_info.get("clientWidth"),
                "detail": m_info
            })
            print(f"  [Mobile] Section '{tab_id}':")
            print(f"    Position: '{m_info.get('position')}' | Scrolled away: {m_info.get('scrolledAway')} (top: {m_info.get('topAtZero')}px -> {m_info.get('topAt300')}px)")
            print(f"    No Horizontal Overflow: {not m_info.get('hasHorizontalOverflow')} (scrollWidth={m_info.get('scrollWidth')}px, clientWidth={m_info.get('clientWidth')}px) | Hamburger Menu: {m_info.get('hasMenuBtn')}")

        # Capture mobile screenshot
        await eval_js(ws, "window.location.hash = '#dashboard';", mid); mid += 1
        await asyncio.sleep(0.5)
        await capture_screenshot(ws, "verified_mobile_dashboard.png", mid); mid += 1

        # Clear emulation
        await send_cmd(ws, "Emulation.clearDeviceMetricsOverride", {}, mid); mid += 1

        print("\n--- 4. CROSS-SECTION FORMATTING & TYPOGRAPHY CONSISTENCY ---")
        heights = set(m["height"] for m in metrics_comparison)
        paddings = set(m["padding"] for m in metrics_comparison)
        title_fonts = set(m["title_font"] for m in metrics_comparison)
        breadcrumb_fonts = set(m["breadcrumb_font"] for m in metrics_comparison)
        print(f"  Distinct Heights: {heights}")
        print(f"  Distinct Paddings: {paddings}")
        print(f"  Distinct Title Fonts: {title_fonts}")
        print(f"  Distinct Breadcrumb Fonts: {breadcrumb_fonts}")
        consistent_formatting = (len(paddings) == 1 and len(title_fonts) == 1 and len(breadcrumb_fonts) == 1)
        print(f"  Consistent Typography & Spacing across all 7 sections: {consistent_formatting}")

        # Final verdicts
        desktop_ok = all(r["is_non_sticky"] and r["controls_ok"] and r["title_matches"] for r in desktop_results)
        excluded_ok = all(clean for _, clean in excluded_results)
        mobile_ok = all(not r["overflow"] and r["scrolledAway"] and r["menuBtn"] for r in mobile_results)

        print("\n================ FINAL REPORT ================")
        print(f"1. Desktop 7 Sections All Non-Sticky & Fully Functional: {desktop_ok}")
        print(f"2. Excluded 4 Sections Clean (No Header / No Banner):    {excluded_ok}")
        print(f"3. Mobile 7 Sections Responsive, Non-Sticky, No Overflow:{mobile_ok}")
        print(f"4. Identical Formatting / Typography Across 7 Sections:  {consistent_formatting}")
        print(f"OVERALL STATUS: {'PASS' if (desktop_ok and excluded_ok and mobile_ok and consistent_formatting) else 'FAIL'}")
        print("==============================================")

if __name__ == "__main__":
    asyncio.run(run_verification())
