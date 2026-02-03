#!/usr/bin/env python3
"""
Tests Gateway & health checks de tous les services via le reverse proxy HTTPS.
"""
import sys
from typing import Iterable

from test_helpers import TestSession, print_test, print_success, print_error


HEALTH_NAMES = ["auth", "user", "game", "blockchain"]


def assert_status(resp, allowed: Iterable[int]):
    assert resp.status_code in allowed, (
        f"Expected status in {list(allowed)}, got {resp.status_code}: {resp.text}"
    )


def test_root_health():
    print_test("Gateway /api/health")
    sess = TestSession()
    resp = sess.get("/public/health")  # nginx rewrites /public/* to gateway
    data = resp.json()
    assert "status" in data, "missing status field"
    print_success("/health OK")


def test_health_all():
    print_test("Gateway /api/healthAll")
    sess = TestSession()
    resp = sess.get("/public/healthAll")
    data = resp.json()
    for name in HEALTH_NAMES:
        assert name in data, f"{name} missing in healthAll response"
    print_success("healthAll contient auth/user/game/blockchain")


def test_health_by_name():
    print_test("Gateway /api/health/:name")
    sess = TestSession()
    for name in HEALTH_NAMES:
        resp = sess.get(f"/public/health/{name}")
        assert_status(resp, [200, 500])
    print_success("/health/:name répond (200 ou 500)")


def test_service_health_proxies():
    """Ping des proxys dédiés /api/{service}/health."""
    print_test("Gateway proxys /api/*/health")
    sess = TestSession()
    mappings = {
        "auth": "/auth/health",
        "user": "/users/health",
        "game": "/game/health",
        "block": "/block/health",
    }
    for key, path in mappings.items():
        resp = sess.get(path, expected_status=200 )
        print_success(f"{path} -> {resp.status_code}")


def main():
    print("\n" + "=" * 60)
    print("🌐 Tests Gateway & Health")
    print("=" * 60)

    tests = [
        test_root_health,
        test_health_all,
        test_health_by_name,
        test_service_health_proxies,
    ]

    passed = failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except AssertionError as e:
            failed += 1
            print_error(f"FAILED: {e}")
        except Exception as e:
            failed += 1
            print_error(f"ERROR: {e}")

    print("\n" + "=" * 60)
    print(f"📊 Résultats: {passed} réussis, {failed} échoués")
    print("=" * 60 + "\n")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
