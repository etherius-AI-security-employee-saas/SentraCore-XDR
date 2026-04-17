from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_platform_endpoints_bootstrap_demo_data():
    client = TestClient(app)

    settings_response = client.get("/api/v1/settings")
    assert settings_response.status_code == 200
    settings_payload = settings_response.json()
    assert settings_payload["platform"]["name"] == "SentraCore XDR Gateway"
    assert settings_payload["tenants"]

    overview_response = client.get("/api/v1/dashboard/overview", params={"tenant_slug": "sentinel-bank"})
    assert overview_response.status_code == 200
    overview_payload = overview_response.json()
    assert overview_payload["tenant"]["slug"] == "sentinel-bank"
    assert overview_payload["live_feed"]

    simulation_response = client.post(
        "/api/v1/simulations/execute",
        json={"tenant_slug": "sentinel-bank", "scenario": "phishing_campaign"},
    )
    assert simulation_response.status_code == 200
    simulation_payload = simulation_response.json()
    assert simulation_payload["scenario"] == "phishing_campaign"
    assert simulation_payload["events_created"]
