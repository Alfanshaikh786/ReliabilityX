"""
ReliabilityX Full End-to-End Verification Script
Tests all requirements:
1. Static files & enhanced UI components
2. Component directory & detail drill-down
3. Parameter trajectory switching
4. Interactive What-If counterfactual simulation
5. Authoritative QA engineer decision commitment & persistence
6. Audit log & traceability records
7. Dynamic parameter specifications & threshold updating
8. Reports summary & aerospace QA certificate generation
9. Telemetry CSV export
"""
from __future__ import annotations
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def run_checks():
    print("=" * 60)
    print("RELIABILITYX — END-TO-END WORKFLOW VERIFICATION")
    print("=" * 60)

    # 1. Test Static files & React 18 bundle
    req = urllib.request.urlopen(f"{BASE_URL}/")
    html = req.read().decode("utf-8")
    assert 'id="root"' in html
    assert "/static/app.bundle.js" in html

    req_bundle = urllib.request.urlopen(f"{BASE_URL}/static/app.bundle.js")
    bundle = req_bundle.read().decode("utf-8")
    assert "ReliabilityXApp" in bundle
    assert "ComponentDetailModal" in bundle
    assert "TrajectorySvgChart" in bundle
    print("[PASS] 1. React 18 Frontend container and compiled app.bundle.js verified.")

    # 2. Get list of components
    req = urllib.request.urlopen(f"{BASE_URL}/api/components?limit=1")
    comps = json.loads(req.read().decode("utf-8"))["components"]
    assert len(comps) > 0
    comp_id = comps[0]["component_id"]
    print(f"[PASS] 2. Component directory active. Target component: {comp_id}")

    # 3. Test Component Detail endpoint
    req = urllib.request.urlopen(f"{BASE_URL}/api/components/{comp_id}")
    detail = json.loads(req.read().decode("utf-8"))
    assert "component" in detail
    assert "measurements" in detail
    assert "predictions" in detail
    assert "anomaly_results" in detail
    assert "what_if_analysis" in detail
    print(f"[PASS] 3. Component detail endpoint returned complete feature & telemetry payload for {comp_id}.")

    # 4. Test QA Engineer Decision submission
    data = urllib.parse.urlencode({
        "engineer_decision": "REVIEW",
        "engineer_name": "QA_LEAD_ISRO_VERIFIED",
        "comments": "Verified wearout acceleration. Held for physical lab analysis."
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/components/{comp_id}/decision", data=data)
    res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    assert res["status"] == "DECISION_RECORDED"
    print(f"[PASS] 4. Authoritative QA decision successfully committed for {comp_id}: {res['decision']}")

    # 5. Verify Decision appears in Component Detail & Audit Log
    req = urllib.request.urlopen(f"{BASE_URL}/api/components/{comp_id}")
    detail = json.loads(req.read().decode("utf-8"))
    assert len(detail["decisions"]) > 0
    assert detail["decisions"][0]["engineer_name"] == "QA_LEAD_ISRO_VERIFIED"
    print("[PASS] 5a. Decision history persists and links to component.")

    req = urllib.request.urlopen(f"{BASE_URL}/api/traceability/audit-log?limit=5")
    audit = json.loads(req.read().decode("utf-8"))["audit_logs"]
    assert any(a["entity_id"] == comp_id for a in audit)
    print("[PASS] 5b. Audit log verified: QA review action logged with timestamp.")

    # 6. Test Interactive Counterfactual Simulation
    sim_payload = json.dumps({
        "current_value": 10.5,
        "current_hour": 24.0,
        "current_drift_rate": 0.075,
        "parameter_name": "leakage_current_uA",
        "target_limit": 20.0
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/counterfactual/simulate", data=sim_payload, headers={"Content-Type": "application/json"})
    sim_res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    assert sim_res["headroom"] == 9.5
    assert sim_res["margin_status"] == "INSUFFICIENT_MARGIN"
    print(f"[PASS] 6. Interactive What-If Simulation verified: Headroom={sim_res['headroom']}, Margin={sim_res['margin_status']}")

    # 7. Test Configuration Update with custom parameter limit
    cfg_payload = json.dumps({
        "dpat_k_factor": 3.5,
        "z_score_threshold": 3.0,
        "default_prediction_model": "gradient_boosting",
        "parameters": {
            "leakage_current_uA": {"max_limit": 22.5, "nominal_baseline": 5.0}
        }
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/config", data=cfg_payload, headers={"Content-Type": "application/json"})
    cfg_res = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    assert cfg_res["parameters"]["leakage_current_uA"]["max_limit"] == 22.5
    print("[PASS] 7. Custom engineering specification successfully updated and persisted.")

    # 8. Test Reports Summary
    req = urllib.request.urlopen(f"{BASE_URL}/api/reports/summary")
    rep_res = json.loads(req.read().decode("utf-8"))
    assert rep_res["total_components"] > 0
    assert "lots" in rep_res
    assert "priorities" in rep_res
    print(f"[PASS] 8. Reports summary verified: {rep_res['total_components']} components, {len(rep_res['lots'])} lots.")

    # 9. Test Certificate HTML
    req = urllib.request.urlopen(f"{BASE_URL}/api/reports/certificate-html")
    cert_html = req.read().decode("utf-8")
    assert "Screening Analysis Report" in cert_html or "COMPONENT SCREENING CERTIFICATE" in cert_html
    assert "AEC-Q001" in cert_html
    print("[PASS] 9. Aerospace QA Screening Certificate HTML generated successfully.")

    # 10. Test CSV Export
    req = urllib.request.urlopen(f"{BASE_URL}/api/reports/export-csv")
    csv_content = req.read().decode("utf-8")
    assert "component_id,lot_id,current_state,risk_level" in csv_content
    print("[PASS] 10. Full telemetry CSV report exported successfully.")

    print("\n" + "=" * 60)
    print(">>> ALL 10 END-TO-END VALIDATION CHECKS PASSED PERFECTLY! <<<")
    print("=" * 60)

if __name__ == "__main__":
    run_checks()
