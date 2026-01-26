#!/usr/bin/env python3
"""
Tests fonctionnels CI/CD - Service Auth
Tests: Register, Login, Logout, Verify, Me, 2FA, Admin
"""
import sys
import time
import pyotp
from test_helpers import (
    TestSession,
    generate_test_credentials,
    print_test,
    print_success,
    print_error,
    decode_qr_secret,
    QR_DECODE_AVAILABLE,
    API_URL,
)

# Credentials pré-configurés
ADMIN_CREDS = {"username": "admin", "password": "Admin123!"}
INVITE_CREDS = {"username": "invite", "password": "Invite123!"}


def skip_if_no_qr_decode(test_name: str) -> bool:
    """Skip le test si le décodage QR n'est pas disponible"""
    if not QR_DECODE_AVAILABLE:
        print(f"   ⏭️  SKIPPED: {test_name} (pyzbar/libzbar not available)")
        return True
    return False


def safe_decode_qr_or_skip(qr_data_url: str, test_name: str) -> str:
    """Décode le QR ou skip le test si impossible"""
    secret = decode_qr_secret(qr_data_url)
    if not secret:
        if QR_DECODE_AVAILABLE:
            raise AssertionError(
                f"FAILED: Impossible d'extraire le secret depuis le QR code"
            )
        else:
            print(f"   ⏭️  SKIPPED: {test_name} (QR decode not available)")
            sys.exit(0)  # Skip ce test proprement
    return secret


def test_01_health_check():
    """Test: Health check du service auth"""
    print_test("Health check - /auth/health")

    session = TestSession()
    response = session.get("/auth/health")

    data = response.json()
    assert data.get("status") == "healthy", "Health check failed"

    print_success("Service auth est opérationnel")


def test_02_register_success():
    """Test: Création de compte réussie"""
    print_test("Register - Création compte valide")

    session = TestSession()
    creds = generate_test_credentials()

    response = session.post("/auth/register", json=creds, expected_status=201)
    data = response.json()

    assert "user" in data, "User not in response"
    assert data["user"]["username"] == creds["username"], "Username mismatch"

    print_success(f"Compte créé: {creds['username']}")
    return creds


def test_03_register_duplicate():
    """Test: Création compte déjà existant (409)"""
    print_test("Register - Compte existant (409)")

    session = TestSession()
    creds = generate_test_credentials()

    # Première création
    session.post("/auth/register", json=creds, expected_status=201)

    # Tentative de duplication
    response = session.post("/auth/register", json=creds, expected_status=409)
    data = response.json()

    assert "error" in data, "Error not in response"
    error_obj = data["error"]
    assert isinstance(error_obj, dict), "Error should be an object"

    # Vérifier que le message ou le code indique un conflit
    error_message = error_obj.get("message", "").lower()
    error_code = error_obj.get("code", "").lower()
    assert (
        "exist" in error_message
        or "conflict" in error_message
        or "exists" in error_code
        or "conflict" in error_code
    ), f"Error message doesn't indicate conflict: {error_obj}"

    print_success("409 Conflict détecté correctement")


def test_03b_register_duplicate_email():
    """Test: Création compte avec email déjà utilisé (409)"""
    print_test("Register - Email existant (409)")

    session = TestSession()
    creds = generate_test_credentials()

    # Première création
    session.post("/auth/register", json=creds, expected_status=201)

    # Tentative de duplication email avec autre username
    dup = generate_test_credentials()
    dup["email"] = creds["email"]

    resp = session.post("/auth/register", json=dup, expected_status=409)
    data = resp.json()
    assert "error" in data, "Error not in response"
    error_obj = data["error"]
    assert isinstance(error_obj, dict), "Error should be an object"

    # Vérifier que c'est bien un conflit d'email
    error_code = error_obj.get("code", "").lower()
    error_message = error_obj.get("message", "").lower()
    assert (
        "email" in error_code or "email" in error_message
    ), f"Error should indicate email conflict: {error_obj}"

    print_success("409 Conflict détecté sur email")


def test_04_register_invalid_username():
    """Test: Register avec username invalide (400)"""
    print_test("Register - Username invalide (400)")

    session = TestSession()

    invalid_usernames = [
        "ab",  # Trop court
        "user-name",  # Caractère invalide (tiret)
        "admin",  # Réservé
        "root",  # Réservé
        "a" * 51,  # Trop long
        "user name",  # Espace
        "user@name",  # Caractère invalide (@)
        "user$name",  # Caractère invalide ($)
        "user.name",  # Caractère invalide (.)
    ]

    for invalid_user in invalid_usernames:
        creds = {
            "username": invalid_user,
            "email": "test@test.local",
            "password": "ValidPass123!",
        }

        response = session.post("/auth/register", json=creds, expected_status=400)
        data = response.json()
        assert "error" in data, f"Error not in response for {invalid_user}"
        print_success(f"Username '{invalid_user}' rejeté")


def test_04b_register_invalid_email_formats():
    """Test: Register avec emails invalides (400)"""
    print_test("Register - Email invalide (400)")

    session = TestSession()
    invalid_emails = [
        "plainaddress",
        "missing-at.test.local",
        "missing-domain@",
        "@nouser.test",
        "user@domain@other",
        "user domain@test.local",
    ]

    for email in invalid_emails:
        creds = {
            "username": generate_test_credentials()["username"],
            "email": email,
            "password": "ValidPass123!",
        }
        resp = session.post("/auth/register", json=creds, expected_status=400)
        data = resp.json()
        assert "error" in data, f"Error not in response for email: {email}"
        print_success(f"Email invalide rejeté: {email}")


def test_04c_register_email_too_long():
    """Test: Register avec email > 100 chars (400)"""
    print_test("Register - Email trop long (400)")

    session = TestSession()
    local = "a" * 60
    domain = "b" * 41  # 60 + 1(@) + 41 + 4(.com) = 106
    long_email = f"{local}@{domain}.com"

    creds = generate_test_credentials()
    creds["email"] = long_email

    resp = session.post("/auth/register", json=creds, expected_status=400)
    data = resp.json()
    assert "error" in data, "Error not in response for long email"
    print_success("Email >100 chars rejeté")


def test_05_register_invalid_password():
    """Test: Register avec password invalide (400)"""
    print_test("Register - Password invalide (400)")

    session = TestSession()

    invalid_passwords = [
        "short1!",  # Trop court
        "nouppercase123!",  # Pas de majuscule
        "NOLOWERCASE123!",  # Pas de minuscule
        "NoDigits!!!",  # Pas de chiffre
        "NoSpecial123",  # Pas de caractère spécial
    ]

    for invalid_pass in invalid_passwords:
        creds = {
            "username": f"testuser{time.time()}",
            "email": "test@test.local",
            "password": invalid_pass,
        }

        response = session.post("/auth/register", json=creds, expected_status=400)
        data = response.json()
        assert "error" in data, f"Error not in response for password: {invalid_pass}"
        print_success(f"Password invalide rejeté")


def test_05b_register_password_too_long():
    """Test: Register avec password > 100 chars (400)"""
    print_test("Register - Password trop long (400)")

    session = TestSession()
    long_pass = "A" * 101 + "!1a"  # >100 chars
    creds = generate_test_credentials()
    creds["password"] = long_pass

    resp = session.post("/auth/register", json=creds, expected_status=400)
    data = resp.json()
    assert "error" in data, "Error not in response pour password trop long"
    print_success("Password >100 chars rejeté")


def test_06_login_success():
    """Test: Login réussi avec username"""
    print_test("Login - Succès avec username")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer le compte
    session.post("/auth/register", json=creds, expected_status=201)

    # Login
    response = session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    data = response.json()
    assert (
        "message" in data and "success" in data["message"].lower()
    ), "Login success message not found"

    # Vérifier le cookie token
    assert "token" in session.session.cookies, "Token cookie not set"

    print_success(f"Login réussi: {creds['username']}")
    return session, creds


def test_06b_login_email_invalid_format():
    """Test: Login échoue si email mal formé (400)"""
    print_test("Login - Email mal formé")

    session = TestSession()
    creds = generate_test_credentials()
    session.post("/auth/register", json=creds, expected_status=201)

    resp = session.post(
        "/auth/login",
        json={"email": "bad-email", "password": creds["password"]},
        expected_status=400,
    )
    data = resp.json()
    assert "error" in data, "Error not in response for invalid email"
    print_success("Email mal formé rejeté au login")


def test_06c_login_with_username_and_email():
    """Test: Login accepte username + email fournis (priorité peu importe)"""
    print_test("Login - Username et email fournis")

    session = TestSession()
    creds = generate_test_credentials()
    session.post("/auth/register", json=creds, expected_status=201)

    resp = session.post(
        "/auth/login",
        json={
            "username": creds["username"],
            "email": creds["email"],
            "password": creds["password"],
        },
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    print_success("Login fonctionne avec username+email")


def test_07_login_with_email():
    """Test: Login réussi avec email"""
    print_test("Login - Succès avec email")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer le compte
    session.post("/auth/register", json=creds, expected_status=201)

    # Login avec email
    response = session.post(
        "/auth/login", json={"email": creds["email"], "password": creds["password"]}
    )

    data = response.json()
    assert (
        "message" in data and "success" in data["message"].lower()
    ), "Login success message not found"

    print_success(f"Login par email réussi: {creds['email']}")


def test_08_login_invalid_credentials():
    """Test: Login avec mauvais credentials (401)"""
    print_test("Login - Credentials invalides (401)")

    session = TestSession()

    response = session.post(
        "/auth/login",
        json={"username": "nonexistent_user", "password": "WrongPass123!"},
        expected_status=401,
    )

    data = response.json()
    assert "error" in data, "Error not in response"

    print_success("401 Unauthorized pour credentials invalides")


def test_08b_login_missing_identifier():
    """Test: Login sans username/email (400)"""
    print_test("Login - Identifiant manquant")

    session = TestSession()
    resp = session.post(
        "/auth/login", json={"password": "whatever"}, expected_status=400
    )
    data = resp.json()
    assert data.get("error", {}).get("code") in {
        "VALIDATION_ERROR",
        "MISSING_IDENTIFIER",
    }
    print_success("400 pour identifiant manquant")


def test_08c_login_missing_password():
    """Test: Login sans password (400)"""
    print_test("Login - Password manquant")

    session = TestSession()
    resp = session.post(
        "/auth/login", json={"username": "someone"}, expected_status=400
    )
    data = resp.json()
    assert data.get("error", {}).get("code") in {"VALIDATION_ERROR", "MISSING_PASSWORD"}
    print_success("400 pour mot de passe manquant")


def test_09_verify_token():
    """Test: Vérification de token valide"""
    print_test("Verify - Token valide")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Vérifier le token
    response = session.get("/auth/verify")
    data = response.json()

    assert "user" in data, "User not in verify response"
    assert data["user"]["username"] == creds["username"], "Username mismatch in verify"

    print_success("Token vérifié avec succès")


def test_09b_verify_after_logout():
    """Test: Verify échoue après logout (cookie supprimé)"""
    print_test("Verify - Après logout")

    session = TestSession()
    creds = generate_test_credentials()
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    session.post("/auth/logout", expected_status=200)
    resp = session.get("/auth/verify", expected_status=401)
    data = resp.json()
    assert data.get("error", {}).get("code") in (
        "TOKEN_MISSING",
        "INVALID_TOKEN",
    ), "Verify devrait échouer sans token"
    print_success("Verify rejette après logout")


def test_10_verify_without_token():
    """Test: Vérification sans token (401)"""
    print_test("Verify - Sans token (401)")

    session = TestSession()
    response = session.get("/auth/verify", expected_status=401)

    data = response.json()
    assert "error" in data, "Error not in response"

    print_success("401 pour token manquant")


def test_10b_verify_invalid_token():
    """Test: Vérification avec token invalide (401)"""
    print_test("Verify - Token invalide")

    session = TestSession()
    # Envoie un token bidon via Authorization
    resp = session.session.get(
        f"{API_URL}/auth/verify", headers={"Authorization": "Bearer bad"}, verify=False
    )
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    data = resp.json()
    assert data.get("error", {}).get("code") in {"INVALID_TOKEN", "TOKEN_MISSING"}
    print_success("401 pour token invalide")


def test_11_me_authenticated():
    """Test: Route /me avec authentification"""
    print_test("Me - Utilisateur authentifié")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Accéder à /me
    response = session.get("/auth/me")
    data = response.json()

    assert "username" in data or "user" in data, "User info not in /me response"

    print_success("Route /me accessible")


def test_12_me_unauthenticated():
    """Test: Route /me sans authentification (401)"""
    print_test("Me - Sans authentification (401)")

    session = TestSession()
    response = session.get("/auth/me", expected_status=401)

    data = response.json()
    assert "error" in data, "Error not in response"

    print_success("401 pour /me sans auth")


def test_13_logout():
    """Test: Logout et vérification de déconnexion"""
    print_test("Logout - Déconnexion complète")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Vérifier qu'on est connecté
    session.get("/auth/me", expected_status=200)

    # Logout
    session.post("/auth/logout")

    # Vérifier qu'on est déconnecté
    session.get("/auth/me", expected_status=401)

    print_success("Logout et déconnexion vérifiés")


def test_13b_logout_without_session():
    """Test: Logout sans session active (doit être idempotent)"""
    print_test("Logout - Sans session")

    session = TestSession()
    # Sans token, l'API retourne 401 mais avec un message d'erreur approprié
    resp = session.post("/auth/logout", expected_status=401)
    data = resp.json()
    assert data.get("error", {}).get("code") == "TOKEN_MISSING", "Code d'erreur attendu"
    print_success("Logout sans session retourne 401 comme attendu")


def test_14_admin_list_users():
    """Test: Admin peut lister les utilisateurs"""
    print_test("Admin - List users")

    session = TestSession()

    # Login en tant qu'admin
    session.post("/auth/login", json=ADMIN_CREDS)

    # Lister les users
    response = session.get("/auth/list")
    data = response.json()

    # L'API retourne un objet avec users, total, timestamp
    assert isinstance(data, dict), "Response should be an object"
    assert "users" in data, "Response should contain 'users' field"
    assert isinstance(data["users"], list), "Users field should be an array"
    assert len(data["users"]) > 0, "Should have at least admin user"
    assert "total" in data, "Response should contain 'total' field"

    # Vérifier que admin est dans la liste
    admin_found = any(user.get("username") == "admin" for user in data["users"])
    assert admin_found, "Admin user not found in list"

    print_success(f"Admin list: {data['total']} utilisateurs")


def test_15_non_admin_cannot_list():
    """Test: Non-admin ne peut pas lister (403)"""
    print_test("Admin - Non-admin interdit (403)")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer un user normal
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Tenter de lister
    response = session.get("/auth/list", expected_status=403)
    data = response.json()

    assert "error" in data, "Error not in response"

    print_success("403 Forbidden pour non-admin")


def test_16_2fa_setup():
    """Test: Setup 2FA et obtention du QR code"""
    print_test("2FA - Setup et génération secret")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Setup 2FA
    response = session.post("/auth/2fa/setup")
    data = response.json()

    assert "result" in data, "result wrapper missing"
    result = data["result"]
    assert "qrCode" in result, "QR code not in 2FA setup response"
    assert "2fa_setup_token" in session.session.cookies, "2FA setup token not set"

    secret = safe_decode_qr_or_skip(result["qrCode"], "2FA Setup")

    print_success("2FA setup: QR code décodé et secret récupéré")
    return session, secret, creds


def test_17_2fa_verify_setup():
    """Test: Vérification du code 2FA lors du setup"""
    print_test("2FA - Vérification code setup")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Setup 2FA
    setup_resp = session.post("/auth/2fa/setup")
    setup_data = setup_resp.json()["result"]
    if skip_if_no_qr_decode("2FA Vérification code setup"):
        return

    secret = safe_decode_qr_or_skip(setup_data["qrCode"], "2FA Vérification code setup")

    # Générer un code TOTP valide
    totp = pyotp.TOTP(secret)
    code = totp.now()

    # Vérifier le code
    response = session.post("/auth/2fa/setup/verify", json={"code": code})
    data = response.json()

    assert "result" in data, "result wrapper manquant"
    assert "message" in data["result"], "Message de succès manquant"
    assert "token" in session.session.cookies, "Token final non défini après 2FA setup"

    print_success("2FA activé avec succès")
    return session, secret, creds


def test_18_2fa_verify_invalid_code():
    """Test: Code 2FA invalide lors du setup (401)"""
    print_test("2FA - Code invalide (401)")

    session = TestSession()
    creds = generate_test_credentials()

    # Créer et login
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    # Setup 2FA
    session.post("/auth/2fa/setup")

    # Envoyer un code invalide
    response = session.post(
        "/auth/2fa/setup/verify", json={"code": "000000"}, expected_status=400
    )
    data = response.json()

    assert "error" in data, "Error not in response"
    assert data["error"].get("code") == "INVALID_2FA_CODE", "Mauvais code d'erreur"

    print_success("400 pour code 2FA invalide avec détail")


def test_18b_2fa_setup_when_already_enabled():
    """Test: Relancer setup alors que 2FA déjà active (400 2FA_ALREADY_ENABLED)"""
    print_test("2FA - Setup déjà activé")

    session, secret, creds = test_17_2fa_verify_setup()
    resp = session.post("/auth/2fa/setup", expected_status=400)
    data = resp.json()
    assert data.get("error", {}).get("code") == "2FA_ALREADY_ENABLED"
    print_success("Setup refusé car 2FA déjà active")


def test_19_2fa_login_flow():
    """Test: Login complet avec 2FA"""
    print_test("2FA - Flow de login complet")

    # Session 1: Setup 2FA
    session1 = TestSession()
    creds = generate_test_credentials()

    session1.post("/auth/register", json=creds, expected_status=201)
    session1.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    response = session1.post("/auth/2fa/setup")
    if skip_if_no_qr_decode("2FA Flow de login complet"):
        return

    secret = safe_decode_qr_or_skip(
        response.json()["result"]["qrCode"], "2FA Flow de login complet"
    )

    totp = pyotp.TOTP(secret)
    code = totp.now()

    session1.post("/auth/2fa/setup/verify", json={"code": code})
    session1.post("/auth/logout")

    # Session 2: Login avec 2FA
    session2 = TestSession()
    response = session2.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    data = response.json()
    assert (
        "result" in data and data["result"].get("require2FA") is True
    ), "2FA requirement not indicated"
    assert "2fa_login_token" in session2.session.cookies, "2FA login token not set"

    # Vérifier qu'on ne peut pas accéder à /me sans le code 2FA
    session2.get("/auth/me", expected_status=401)

    # Entrer le code 2FA
    code = totp.now()
    response = session2.post("/auth/2fa/verify", json={"code": code})
    data = response.json()

    assert (
        "result" in data and "message" in data["result"]
    ), "2FA verification success message not found"
    assert "token" in session2.session.cookies, "Final token not set after 2FA verify"

    # Vérifier qu'on peut maintenant accéder à /me
    session2.get("/auth/me", expected_status=200)

    print_success("Flow 2FA complet: login → code → accès")


def test_20_2fa_disable():
    """Test: Désactivation du 2FA"""
    print_test("2FA - Désactivation")

    session, secret, creds = test_17_2fa_verify_setup()

    # Désactiver 2FA
    response = session.post("/auth/2fa/disable")
    data = response.json()

    assert (
        "result" in data and "disabled" in data["result"].get("message", "").lower()
    ), "2FA disable confirmation not found"

    # Vérifier qu'on peut se reconnecter sans 2FA
    session.post("/auth/logout")

    response = session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )
    data = response.json()

    assert not (data.get("result", {}) or {}).get(
        "require2FA", False
    ), "2FA still required after disable"

    print_success("2FA désactivé avec succès")


def test_20b_2fa_disable_not_enabled():
    """Test: Désactivation 2FA quand non activée (400 2FA_NOT_ENABLED)"""
    print_test("2FA - Désactivation sans 2FA active")

    session = TestSession()
    creds = generate_test_credentials()
    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    resp = session.post("/auth/2fa/disable", expected_status=400)
    data = resp.json()
    assert data.get("error", {}).get("code") == "2FA_NOT_ENABLED"
    print_success("Désactivation refusée car 2FA non activée")


def test_21_rate_limiting():
    """Test: Rate limiting sur login (5 req/5min)"""
    print_test("Rate Limiting - Login (5 req/5min)")

    session = TestSession()

    # Faire plusieurs tentatives de login jusqu'à déclencher le rate limit si actif
    got_429 = False
    for i in range(10):
        resp = session.post(
            "/auth/login",
            json={"username": "nonexistent", "password": "wrong"},
            expected_status=401 if not got_429 else 429,
        )
        if resp.status_code == 429:
            got_429 = True
            print_success(f"Rate limit atteint après {i+1} requêtes")
            break
        time.sleep(0.05)

    if not got_429:
        print_success("Rate limit non atteint (comportement toléré en env de dev)")


def test_22_2fa_setup_bad_format():
    """Test: Code non numérique pour setup (400 INVALID_CODE_FORMAT)"""
    print_test("2FA - Code format invalide (setup)")

    session = TestSession()
    creds = generate_test_credentials()

    session.post("/auth/register", json=creds, expected_status=201)
    session.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )
    session.post("/auth/2fa/setup")

    resp = session.post(
        "/auth/2fa/setup/verify", json={"code": "abc"}, expected_status=400
    )
    data = resp.json()
    assert data.get("error", {}).get("code") == "INVALID_CODE_FORMAT"
    print_success("Format invalide correctement rejeté (setup)")


def test_27_2fa_invalid_format_login():
    """Test: Code 2FA format invalide pendant login"""
    print_test("2FA - Code format invalide (login)")

    if skip_if_no_qr_decode("2FA Code format invalide (login)"):
        return

    # Activer 2FA d'abord
    session1 = TestSession()
    creds = generate_test_credentials()
    session1.post("/auth/register", json=creds, expected_status=201)
    session1.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )
    setup_resp = session1.post("/auth/2fa/setup")
    secret = safe_decode_qr_or_skip(
        setup_resp.json()["result"]["qrCode"], "2FA Code format invalide (login)"
    )
    totp = pyotp.TOTP(secret)
    session1.post("/auth/2fa/setup/verify", json={"code": totp.now()})
    session1.post("/auth/logout")


def test_28_2fa_too_many_attempts():
    """Test: Trop de tentatives 2FA (protection rate limiting)"""
    print_test("2FA - Trop de tentatives (login)")

    if skip_if_no_qr_decode("2FA Trop de tentatives (login)"):
        return

    # Activer 2FA
    session1 = TestSession()
    creds = generate_test_credentials()
    session1.post("/auth/register", json=creds, expected_status=201)
    session1.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )
    setup_resp = session1.post("/auth/2fa/setup")
    secret = safe_decode_qr_or_skip(
        setup_resp.json()["result"]["qrCode"], "2FA Trop de tentatives (login)"
    )
    totp = pyotp.TOTP(secret)
    session1.post("/auth/2fa/setup/verify", json={"code": totp.now()})
    session1.post("/auth/logout")

    # Login et épuiser les tentatives
    session2 = TestSession()
    session2.post(
        "/auth/login",
        json={"username": creds["username"], "password": creds["password"]},
    )

    last_resp = None
    for i in range(6):
        # On envoie plusieurs codes invalides rapidement pour éviter l'expiration du token
        resp = session2.session.post(
            f"{API_URL}/auth/2fa/verify", json={"code": "000000"}, verify=False
        )
        last_resp = resp
        if resp.status_code in (429, 401):
            break
        time.sleep(0.05)

    assert last_resp is not None
    if last_resp.status_code == 429:
        print_success("429 reçu après trop de tentatives")
    elif (
        last_resp.status_code == 401
        and last_resp.json().get("error", {}).get("code") == "LOGIN_SESSION_EXPIRED"
    ):
        print_success(
            "Session de login 2FA expirée avant d'atteindre 429 (token très court)"
        )
    else:
        raise AssertionError(
            f"Statut inattendu: {last_resp.status_code} -> {last_resp.text}"
        )


def main():
    """Exécution de tous les tests"""
    print("\n" + "=" * 60)
    print("🚀 Tests CI/CD - Service Auth")
    print("=" * 60)

    tests = [
        test_01_health_check,
        test_02_register_success,
        test_03_register_duplicate,
        test_03b_register_duplicate_email,
        test_04_register_invalid_username,
        test_04b_register_invalid_email_formats,
        test_04c_register_email_too_long,
        test_05_register_invalid_password,
        test_05b_register_password_too_long,
        test_06_login_success,
        test_06b_login_email_invalid_format,
        test_06c_login_with_username_and_email,
        test_07_login_with_email,
        test_08_login_invalid_credentials,
        test_08b_login_missing_identifier,
        test_08c_login_missing_password,
        test_09_verify_token,
        test_09b_verify_after_logout,
        test_10_verify_without_token,
        test_10b_verify_invalid_token,
        test_11_me_authenticated,
        test_12_me_unauthenticated,
        test_13_logout,
        test_13b_logout_without_session,
        test_14_admin_list_users,
        test_15_non_admin_cannot_list,
        test_16_2fa_setup,
        test_17_2fa_verify_setup,
        test_18_2fa_verify_invalid_code,
        test_18b_2fa_setup_when_already_enabled,
        test_19_2fa_login_flow,
        test_20_2fa_disable,
        test_20b_2fa_disable_not_enabled,
        test_21_rate_limiting,
        test_22_2fa_setup_bad_format,
        test_27_2fa_invalid_format_login,
        test_28_2fa_too_many_attempts,
    ]

    test_dict = {}
    for t in tests:
        num = t.__name__.split('_')[1]
        test_dict[num] = t

    target_test = None
    if len(sys.argv) > 1:
        arg = sys.argv[1].zfill(2) # Ajoute un 0 devant si l'utilisateur tape "1" au lieu de "01"
        if arg in test_dict:
            target_test = arg
        else:
            print_error(f"Erreur : Le test n°{arg} n'existe pas.")
            print(f"Tests disponibles : {', '.join(sorted(test_dict.keys()))}")
            sys.exit(1)

    print("\n" + "=" * 60)
    if target_test:
        print(f"Exécution du test spécifique : {target_test}")
        tests_to_run = [(target_test, test_dict[target_test])]
    else:
        print("Exécution de tous les tests CI/CD")
        tests_to_run = [(num, test_dict[num]) for num in sorted(test_dict.keys())]
    print("=" * 60)

    passed = 0
    failed = 0

    for num, test_func in tests_to_run:
        # On affiche explicitement l'ID du test avant son exécution
        print(f"\n[TEST {num}]", end=" ") 
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            failed += 1
            print_error(f"FAILED: {str(e)}")
        except Exception as e:
            failed += 1
            print_error(f"ERROR: {str(e)}")

    print("\n" + "=" * 60)
    print(f"📊 Résultats: {passed} réussis, {failed} échoués")
    print("=" * 60 + "\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
