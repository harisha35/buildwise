from app.models.enums import UserRole
from tests.conftest import auth_headers, make_user


def test_attendance_edit_is_captured_in_audit_log(client, db):
    make_user(db, UserRole.owner, "audit-owner@buildwise.example")
    db.flush()
    headers = auth_headers(client, "audit-owner@buildwise.example")

    project = client.post("/api/v1/projects", json={"name": "Audit Site"}, headers=headers).json()
    worker = client.post(
        "/api/v1/workers", json={"name": "Ravi", "default_daily_rate": 500}, headers=headers
    ).json()

    create_resp = client.post(
        "/api/v1/attendance",
        json={
            "project_id": project["id"],
            "date": "2026-08-05",
            "entries": [{"worker_id": worker["id"], "status": "present", "ot_hours": 0}],
        },
        headers=headers,
    )
    attendance_id = create_resp.json()["saved"][0]["id"]

    empty_log = client.get(f"/api/v1/attendance/{attendance_id}/audit-log", headers=headers)
    assert empty_log.status_code == 200
    assert empty_log.json() == []

    edit_resp = client.post(
        "/api/v1/attendance",
        json={
            "project_id": project["id"],
            "date": "2026-08-05",
            "entries": [{"worker_id": worker["id"], "status": "half_day", "ot_hours": 2}],
        },
        headers=headers,
    )
    assert edit_resp.status_code == 200

    log_resp = client.get(f"/api/v1/attendance/{attendance_id}/audit-log", headers=headers)
    assert log_resp.status_code == 200
    entries = log_resp.json()
    assert len(entries) == 2  # status + ot_hours both changed

    fields = {entry["field_name"]: entry for entry in entries}
    assert fields["status"]["old_value"] == "present"
    assert fields["status"]["new_value"] == "half_day"
    assert fields["ot_hours"]["old_value"] == "0"
    assert fields["ot_hours"]["new_value"] == "2"
    for entry in entries:
        assert entry["changed_at"] is not None
        assert entry["attendance_id"] == attendance_id
