# Documentation 2FA - Système d'Authentification à Deux Facteurs

## Vue d'ensemble

Le système 2FA (Two-Factor Authentication) a été intégré au module auth existant avec Google Authenticator. Il offre une sécurité renforcée pour les comptes utilisateurs.

## Architecture

### Backend (déjà existant)

- **Routes disponibles** :
  - `POST /auth/2fa/setup` - Génère le QR code
  - `POST /auth/2fa/setup/verify` - Valide l'activation de la 2FA
  - `POST /auth/2fa/verify` - Vérifie le code OTP lors du login
  - `POST /auth/2fa/disable` - Désactive la 2FA

### Frontend (nouvellement implémenté)

#### Pages créées

1. **`TwoFactorVerifyPage.tsx`** (`/2fa/verify`)
   - Page de vérification après login
   - Accessible sans authentification préalable (après login username/password)
   - Champ de saisie du code à 6 chiffres
   - Gestion des erreurs (code invalide, session expirée, trop de tentatives)

2. **`TwoFactorSetupPage.tsx`** (`/2fa/setup`)
   - Page de configuration 2FA (protégée, nécessite login)
   - Génération et affichage du QR code
   - Instructions étape par étape
   - Validation du premier code OTP pour activer la 2FA

3. **`TwoFactorDisablePage.tsx`** (`/2fa/disable`)
   - Page de désactivation (protégée, nécessite login)
   - Avertissement de sécurité
   - Confirmation avant désactivation

## Flow d'Utilisation

### Activation de la 2FA

```
1. Utilisateur connecté → /2fa/setup
2. Backend génère secret + QR code (stocké dans cookie 2fa_setup_token)
3. Utilisateur scanne le QR code avec Google Authenticator
4. Utilisateur entre le code OTP généré
5. Backend valide le code et active définitivement la 2FA
6. Redirection vers le profil
```

### Login avec 2FA activée

```
1. Utilisateur entre username/email + password → POST /auth/login
2. Backend détecte 2FA activée
3. Backend retourne { require2FA: true } + cookie 2fa_login_token
4. Frontend redirige automatiquement vers /2fa/verify
5. Utilisateur entre le code OTP de son application
6. Backend valide le code et génère le token JWT final
7. Frontend connecte l'utilisateur et redirige vers le profil
```

### Désactivation de la 2FA

```
1. Utilisateur connecté → /2fa/disable
2. Clic sur "Désactiver la 2FA"
3. Backend désactive la 2FA pour l'utilisateur
4. Message de confirmation
5. Redirection vers le profil
```

## Changements apportés au code

### Fichiers modifiés

1. **`auth-api.ts`**
   - Modifié `login()` pour retourner soit `{ username }` soit `{ require2FA: true, username, message }`
   - Ajouté `setup2FA()`, `verify2FASetup()`, `verify2FALogin()`, `disable2FA()`

2. **`LoginForm.tsx`**
   - Ajouté gestion de `require2FA` dans le state
   - Ajouté redirection automatique vers `/2fa/verify` si `require2FA: true`

3. **`App.tsx`**
   - Ajouté composant `ProtectedRoute` pour protéger les routes nécessitant authentification
   - Ajouté les 3 routes 2FA :
     - `/2fa/verify` (publique)
     - `/2fa/setup` (protégée)
     - `/2fa/disable` (protégée)

### Fichiers créés

1. `pages/TwoFactorVerifyPage.tsx`
2. `pages/TwoFactorSetupPage.tsx`
3. `pages/TwoFactorDisablePage.tsx`

## Guide d'intégration UI

### Ajouter des liens dans le profil utilisateur

Pour permettre aux utilisateurs d'accéder facilement à la configuration 2FA, vous pouvez ajouter dans la page de profil :

```tsx
// Dans ProfilePage.tsx ou un composant Settings
import { Link } from 'react-router-dom';

// Dans le JSX
<div className="security-section">
  <h2>Sécurité du compte</h2>
  <Link to="/2fa/setup">
    <button>Activer la 2FA</button>
  </Link>
  <Link to="/2fa/disable">
    <button>Désactiver la 2FA</button>
  </Link>
</div>;
```

### Afficher le statut 2FA

Pour afficher si la 2FA est activée, vous devrez ajouter cette information au profil utilisateur :

```tsx
// Ajout possible dans UserDTO ou ProfileDTO
interface UserProfile {
  username: string;
  avatarUrl: string | null;
  has2FA?: boolean; // À ajouter côté backend dans /auth/me
}

// Utilisation
{
  user.has2FA && <span className="badge">🔒 2FA activée</span>;
}
```

## Gestion d'erreurs

### Erreurs backend gérées

- **`VALIDATION_ERROR`** : Format de code invalide (pas 6 chiffres)
- **`INVALID_2FA_CODE`** : Code OTP incorrect (avec nombre de tentatives restantes)
- **`TOO_MANY_ATTEMPTS`** : Trop de tentatives échouées
- **`UNAUTHORIZED`** / `LOGIN_SESSION_EXPIRED` : Session expirée (cookie 2fa_login_token)
- **`SETUP_SESSION_EXPIRED`** : Session de configuration expirée (cookie 2fa_setup_token)
- **`TOTP_ALREADY_ENABLED`** : 2FA déjà activée
- **`2FA_NOT_ENABLED`** : Tentative de désactivation alors que 2FA pas activée

### Gestion côté frontend

Toutes les pages 2FA gèrent les erreurs et les affichent de manière user-friendly avec :

- Messages d'erreur clairs
- Distinction entre erreurs de champ (code invalide) et erreurs système
- Indications sur les actions à entreprendre

## Cookies utilisés

Le backend utilise plusieurs cookies pour gérer les sessions 2FA :

1. **`token`** : JWT de session authentifiée (après login complet)
2. **`2fa_login_token`** : Token temporaire pendant la phase de vérification 2FA (2 min)
3. **`2fa_setup_token`** : Token temporaire pendant la configuration 2FA (2 min)

Tous ces cookies sont :

- **httpOnly** : Non accessibles en JavaScript (sécurité XSS)
- **secure** : Transmis uniquement en HTTPS (en production)
- **sameSite: strict** : Protection CSRF

## Sécurité

### Protections implémentées

- **Rate limiting** : Limite le nombre de tentatives de vérification
- **Sessions temporaires** : Les tokens de setup/login expirent après 2 minutes
- **Tentatives limitées** : Maximum 3 tentatives par session avant invalidation
- **Cookies sécurisés** : httpOnly, secure, sameSite
- **Validation backend** : Tous les codes OTP sont vérifiés côté serveur uniquement

### Recommandations

- Ne jamais logger ou afficher les secrets TOTP
- Toujours utiliser HTTPS en production
- Encourager les utilisateurs à sauvegarder leurs codes de récupération (à implémenter)
- Considérer l'ajout de codes de backup (feature future)

## Tests recommandés

### Scénarios à tester

1. **Activation 2FA**
   - [ ] Génération du QR code
   - [ ] Validation avec code correct
   - [ ] Rejet avec code incorrect
   - [ ] Expiration de session (attendre 2 min)
   - [ ] Trop de tentatives (3 codes incorrects)

2. **Login avec 2FA**
   - [ ] Redirection automatique vers /2fa/verify
   - [ ] Login réussi avec code correct
   - [ ] Rejet avec code incorrect
   - [ ] Expiration de session login

3. **Désactivation 2FA**
   - [ ] Désactivation réussie
   - [ ] Login direct après désactivation (pas de redirection 2FA)

4. **Edge cases**
   - [ ] Tentative d'accès à /2fa/setup sans être connecté
   - [ ] Tentative d'activation alors que 2FA déjà active
   - [ ] Tentative de désactivation alors que 2FA pas active

## Améliorations futures possibles

1. **Codes de récupération (backup codes)**
   - Générer 10 codes à usage unique lors de l'activation
   - Permettre de se connecter avec ces codes si l'app 2FA est inaccessible

2. **QR code + secret manuel**
   - Afficher le secret en texte brut pour saisie manuelle (si scan impossible)

3. **Historique de connexions**
   - Logger les connexions avec 2FA réussies/échouées
   - Notifier l'utilisateur en cas de tentatives suspectes

4. **Email de notification**
   - Envoyer un email lors de l'activation/désactivation 2FA
   - Alerter en cas de trop de tentatives échouées

5. **Support de multiples méthodes 2FA**
   - SMS (moins sécurisé, mais pratique)
   - Clés de sécurité matérielles (FIDO2/WebAuthn)
   - Notifications push

## Ressources

- **Google Authenticator** : [iOS](https://apps.apple.com/app/google-authenticator/id388497605) | [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- **RFC 6238** : TOTP (Time-Based One-Time Password)
- **otplib** : Bibliothèque backend utilisée pour générer/vérifier les codes OTP

---

**Auteur** : GitHub Copilot
**Date** : 19 février 2026
**Version** : 1.0.0
