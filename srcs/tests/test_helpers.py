# Configuration
"""
Helpers communs pour les tests CI/CD Transcendence
"""
import base64
import io
import time
from typing import Optional, Dict, Any

import requests
from PIL import Image

# Import optionnel pour le décodage QR (nécessite libzbar système)
try:
    from pyzbar.pyzbar import decode as qr_decode
    QR_DECODE_AVAILABLE = True
except ImportError:
    print("⚠️  Warning: pyzbar not available (missing libzbar system library)")
    print("   QR code decoding will be disabled in 2FA tests")
    print("   To fix: sudo apt-get install libzbar0")
    QR_DECODE_AVAILABLE = False
    qr_decode = None

# Configuration
BASE_URL = "https://localhost:4430"
API_URL = f"{BASE_URL}/api"
VERIFY_SSL = False

# Désactiver les warnings SSL
requests.packages.urllib3.disable_warnings(
    requests.packages.urllib3.exceptions.InsecureRequestWarning
)


class TestSession:
    """Gestionnaire de session HTTP avec cookies automatiques"""

    def __init__(self):
        self.session = requests.Session()
        self.session.verify = VERIFY_SSL
        self.username: Optional[str] = None
        self.user_id: Optional[int] = None

    def _build_url(self, endpoint: str) -> str:
        """Construit l'URL finale en autorisant les chemins publics /public/* ou absolus."""
        if endpoint.startswith('http://') or endpoint.startswith('https://'):
            return endpoint
        if endpoint.startswith('/public'):
            return f"{BASE_URL}{endpoint}"
        return f"{API_URL}{endpoint}"

    def post(self, endpoint: str, json: Optional[Dict] = {}, expected_status: int = 200) -> requests.Response:
        """POST request avec validation du status"""
        url = self._build_url(endpoint)
        response = self.session.post(url, json=json)
        assert response.status_code == expected_status, (
            f"Expected {expected_status}, got {response.status_code}: {response.text}"
        )
        return response

    def get(self, endpoint: str, expected_status: int = 200) -> requests.Response:
        """GET request avec validation du status"""
        url = self._build_url(endpoint)
        response = self.session.get(url)
        assert response.status_code == expected_status, (
            f"Expected {expected_status}, got {response.status_code}: {response.text}"
        )
        return response

    def delete(self, endpoint: str, expected_status: int = 200) -> requests.Response:
        """DELETE request avec validation du status"""
        url = self._build_url(endpoint)
        response = self.session.delete(url)
        assert response.status_code == expected_status, (
            f"Expected {expected_status}, got {response.status_code}: {response.text}"
        )
        return response

    def login(self, username: str, password: str) -> Dict[str, Any]:
        """Login et stockage des infos utilisateur"""
        response = self.post("/auth/login", json={"username": username, "password": password})
        data = response.json()
        self.username = username
        if "user" in data:
            self.user_id = data["user"].get("id")
        return data

    def logout(self):
        """Logout et nettoyage de la session"""
        self.post("/auth/logout")
        self.username = None
        self.user_id = None
        self.session.cookies.clear()


def _to_base36(num: int) -> str:
    """Convertit un entier positif en base36 (0-9a-z)."""
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if num == 0:
        return "0"
    res = []
    while num:
        num, rem = divmod(num, 36)
        res.append(chars[rem])
    return "".join(reversed(res))


def generate_unique_username(prefix: str = "tu") -> str:
    """Génère un username court (<20 chars) basé sur le temps en base36."""
    ts36 = _to_base36(int(time.time() * 1000))  # ~8-9 chars
    username = f"{prefix}_{ts36}"
    # Clamp to 20 chars max to respecter la validation backend
    return username[:20]


def generate_test_credentials() -> Dict[str, str]:
    """Génère des credentials de test valides"""
    username = generate_unique_username()
    return {
        "username": username,
        "email": f"{username}@test.local",
        "password": "TestPass123!",
    }


def print_test(name: str):
    """Affiche le nom du test en cours"""
    print(f"\n🧪 Test: {name}")


def print_success(message: str):
    """Affiche un message de succès"""
    print(f"   ✅ {message}")


def print_error(message: str):
    """Affiche un message d'erreur"""
    print(f"   ❌ {message}")


def decode_qr_secret(qr_data_url: str) -> Optional[str]:
    """Extrait le secret TOTP depuis une data URL de QR code."""
    if not QR_DECODE_AVAILABLE:
        print("⚠️  QR decode skipped: pyzbar not available")
        return None

    if not qr_data_url.startswith("data:image"):
        return None
    try:
        header, b64_data = qr_data_url.split(",", 1)
        img_bytes = base64.b64decode(b64_data)
        image = Image.open(io.BytesIO(img_bytes))
        decoded = qr_decode(image)
        if not decoded:
            return None
        payload = decoded[0].data.decode()
        # payload ressemble à otpauth://totp/Issuer:username?secret=XXXX&issuer=Issuer
        if "secret=" in payload:
            return payload.split("secret=")[1].split("&")[0]
        return None
    except Exception:
        return None
