"""Smoke checks for the application factory and its actual route."""

from claimbridge import create_app


def test_liveness_is_explicit_about_scaffold():
    app = create_app({"TESTING": True})
    response = app.test_client().get("/api/v1/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok", "stage": "scaffold"}


def test_factories_do_not_share_configuration():
    first = create_app({"TESTING": True, "MAX_CONTENT_LENGTH": 10})
    second = create_app({"TESTING": True})
    assert first.config["MAX_CONTENT_LENGTH"] == 10
    assert second.config["MAX_CONTENT_LENGTH"] == 20 * 1024 * 1024
