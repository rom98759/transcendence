# Tests CI/CD Transcendence

Suite de tests fonctionnels Python pour valider les endpoints backend.

## Installation

```bash
cd srcs/tests
pip install -r requirements.txt
```

## Exécution

### Service Auth (complet)

```bash
python test_auth.py
```

### Gateway & health checks

```bash
python test_gateway.py
```

### Runner global

```bash
python test.py
```

### Tests inclus

#### Authentification

- ✅ Health check
- ✅ Register (succès, duplicata, validations)
- ✅ Login (username, email, credentials invalides)
- ✅ Verify token (valide, invalide)
- ✅ Route /me (authentifié, non-authentifié)
- ✅ Logout

#### 2FA

- ✅ Setup 2FA
- ✅ Vérification code setup
- ✅ Code invalide
- ✅ Login flow complet avec 2FA
- ✅ Désactivation 2FA

#### Admin

- ✅ List users (admin)
- ✅ List users interdit (non-admin)

#### Sécurité

- ✅ Rate limiting

## Prérequis

- Backend running sur `https://localhost:4430`
- Comptes admin/invite configurés dans `.env.auth` ou auto-créés
- Services docker up: `make up` ou `docker-compose up`

### CI/CD (GitHub Actions)

Les tests sont automatiquement exécutés dans GitHub Actions avec :

- Installation automatique de Python 3.10
- Installation des dépendances système (`libzbar0` pour QR codes 2FA)
- Installation des requirements Python
- Démarrage des services backend via `make up`
- Exécution des tests fonctionnels
- Nettoyage automatique des services

## Exit codes

- `0`: Tous les tests réussis
- `1`: Au moins un test échoué

## Notes

- Les tests utilisent `requests.Session()` pour la gestion automatique des cookies
- SSL verification désactivée (`verify=False`)
- Chaque test crée ses propres utilisateurs avec usernames courts (<20 chars)
- Tests de 2FA utilisent `pyotp` pour générer des codes TOTP valides

## Structure des tests

```
srcs/tests/
├── requirements.txt       # Dépendances Python
├── test_helpers.py        # Helpers et utilitaires communs
├── test_auth.py           # Tests du service d'authentification (cas poussés 2FA)
├── test_gateway.py        # Health checks gateway + proxys
├── test.py                # Runner global séquentiel
└── README.md             # Documentation
```

## Développement

### Ajouter un nouveau test

```python
def test_XX_feature():
    """Test: Description du test"""
    print_test("Nom du test")

    session = TestSession()
    # ... votre logique de test ...

    print_success("Message de succès")
```

### Guidelines

- Utiliser `TestSession()` pour gérer les cookies automatiquement
- Préfixer les fonctions de test par `test_XX_` (numéro séquentiel)
- Utiliser `expected_status` pour valider les codes HTTP
- Créer des utilisateurs uniques via `generate_test_credentials()`
- Nettoyer les sessions avec `logout()` ou créer de nouvelles sessions

## Troubleshooting

### Erreur SSL

```
SSLError: [SSL: CERTIFICATE_VERIFY_FAILED]
```

→ Normal, les tests désactivent la vérification SSL (`verify=False`)

### Services non accessibles

```
Connection refused
```

→ Vérifier que les services Docker sont lancés:

```bash
cd srcs
docker-compose up -d
docker-compose ps  # Vérifier le statut
```

### Rate limiting

```
429 Too Many Requests
```

→ Attendre 5 minutes ou redémarrer le service auth pour reset le rate limiter

## Roadmap

- [x] Tests Gateway (health checks, proxies)
- [ ] Tests Users (profils, friends)
- [ ] Tests Game (sessions, settings)
- [ ] Tests Blockchain (tournaments)
- [x] Script lanceur global (`test.py`)
- [ ] Intégration GitHub Actions CI/CD
