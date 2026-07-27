# Puurga

**Puurga** est une plateforme de réseau social gamifiée qui combine publication de contenu, messagerie en temps réel, jeux intégrés et un système unique de **survie sociale** (purge, purgatoire, mode fantôme, alliances). L'application est conçue pour encourager l'engagement positif tout en sanctionnant l'inactivité ou les comportements négatifs via un écosystème de crédits, de réputation et de conséquences visuelles.

Site de production : [https://www.puurga.com](https://www.puurga.com)

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Stack technique](#stack-technique)
4. [Architecture](#architecture)
5. [Structure du projet](#structure-du-projet)
6. [Installation et démarrage](#installation-et-démarrage)
7. [Variables d'environnement](#variables-denvironnement)
8. [Routes frontend](#routes-frontend)
9. [API backend](#api-backend)
10. [Systèmes métier](#systèmes-métier)
11. [Temps réel et WebSocket](#temps-réel-et-websocket)
12. [Internationalisation](#internationalisation)
13. [Déploiement](#déploiement)
14. [État du projet](#état-du-projet)
15. [Documentation complémentaire](#documentation-complémentaire)

---

## Vue d'ensemble

Puurga se distingue des réseaux sociaux classiques par plusieurs mécaniques uniques :

| Concept | Description |
|---------|-------------|
| **Purge** | Action négative qu'un utilisateur peut infliger à un autre (équivalent d'un « dislike » punitif) |
| **Ghost Mode** | État de bannissement social : l'utilisateur « fantômisé » ne peut plus publier, commenter ni envoyer de messages |
| **Purgatory** | Zone intermédiaire avant/après ghost mode, avec demandes de rédemption |
| **Survival System** | Moteur de réputation, menaces, inactivité et états de survie |
| **Alliances** | Système d'alliés pouvant soutenir des utilisateurs ghostés |
| **Crédits (Purga Points)** | Monnaie virtuelle gagnée par l'activité (posts, likes, jeux, connexion quotidienne) |
| **Jeux intégrés** | Catalogue de mini-jeux (Purga Slicer, Purga Rift, Redemption, The Watchman…) récompensant en crédits |

---

## Fonctionnalités principales

### Réseau social

- **Fil d'actualité** avec posts texte, images, vidéos, arrière-plans personnalisés
- **Réactions** : likes, puurgas (positif), purges (négatif)
- **Commentaires** avec support emoji
- **Stories / Statuts** avec suivi des vues
- **Partage** de posts
- **Localisation** sur les posts (Leaflet / OpenStreetMap)
- **Profils utilisateurs** publics et privés avec galerie, bio, paramètres de confidentialité
- **Amis et demandes d'amis** avec statut en ligne
- **Groupes** avec administration, invitations et chat de groupe
- **Notifications** en temps réel (push + in-app)
- **Traduction de contenu** multilingue

### Messagerie

- Messages directs texte et images
- Indicateurs de frappe (typing)
- Statut en ligne / hors ligne
- Appels audio/vidéo via **ZegoCloud**
- WebSocket pour la livraison instantanée

### Gamification

- **Dashboard Puurga** avec statistiques et activité
- **Purga Games** : catalogue de jeux avec récompenses en crédits
- **Système de crédits** avec plafonds journaliers et historique de transactions
- **Survival Status Bar** : barre de menace, pression de purge, feedback émotionnel

### Administration

- **Super Admin** : gestion globale, audit logs
- **Admin utilisateurs** : liste et modération
- **Sécurité** : événements CSP, logs d'erreurs système

### Onboarding

- Écran vidéo d'introduction
- Sélection de langue
- Écran de bienvenue
- Authentification (email/mot de passe, Google OAuth via Supabase)

---

## Stack technique

### Frontend

| Technologie | Usage |
|-------------|-------|
| **React 18** + **TypeScript** | Interface utilisateur |
| **Vite 5** | Build tool et dev server |
| **Tailwind CSS** | Styling (glassmorphism, thème sombre/clair) |
| **React Router 6** | Navigation et routes protégées |
| **Zustand** | Stores locaux (auth, posts, onboarding audio…) |
| **React Context** | État global (user, messages, survival, notifications…) |
| **Framer Motion** | Animations |
| **i18next** | Internationalisation (10 langues) |
| **Axios** | Client HTTP |
| **Supabase JS** | Auth et stockage |
| **Three.js** | Jeux 3D intégrés |
| **Leaflet** | Cartes et géolocalisation |
| **ZegoUIKit** | Appels vidéo/audio |
| **react-hot-toast** | Notifications toast |

### Backend

| Technologie | Usage |
|-------------|-------|
| **Node.js** + **Express 4** | API REST |
| **TypeScript** | Typage |
| **Supabase** (PostgreSQL) | Base de données et auth |
| **Sequelize** | ORM (modèles legacy) |
| **WebSocket (ws)** | Temps réel |
| **JWT** | Authentification API |
| **bcrypt** | Hachage mots de passe |
| **Helmet** + **CORS** + **Rate limiting** | Sécurité |
| **Multer** | Upload de fichiers |
| **OpenAI** | Traduction / IA (route translate) |
| **PM2** | Process manager en production |

### Infrastructure

| Service | Usage |
|---------|-------|
| **DigitalOcean Droplet** | Hébergement serveur |
| **Nginx** | Reverse proxy, fichiers statiques |
| **GitHub Actions** | CI/CD automatique sur push `main` |
| **Supabase Storage** | Médias et avatars |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React + Vite)                    │
│  Pages │ Components │ Contexts │ Hooks │ Stores │ i18n      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP /api  +  WebSocket /ws
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express + Node.js)                 │
│  Routes → Middleware → Services → Supabase (PostgreSQL)       │
│  WebSocketManager (notifications, messages, statut online)   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Auth + DB + Storage)                  │
└─────────────────────────────────────────────────────────────┘
```

### Couches backend

```
backend/
├── server.ts              # Point d'entrée Express + HTTP + WS
├── websocketManager.ts    # Gestionnaire WebSocket singleton
├── routes/                # Endpoints REST par domaine
├── services/              # Logique métier (credits, survival, media…)
├── middleware/            # Auth, ghost mode, super admin, erreurs
├── migrations/            # Schéma SQL PostgreSQL
├── models/                # Modèles Sequelize
└── config/                # Database, storage, Supabase
```

### Couches frontend

```
src/
├── App.tsx                # Router principal
├── pages/                 # Pages par route
├── components/            # Composants UI réutilisables
├── context/               # Providers React (User, Survival, Messages…)
├── hooks/                 # Hooks personnalisés
├── services/              # Appels API et WebSocket client
├── store/                 # Stores Zustand
├── i18n/                  # Traductions
├── types/                 # Types TypeScript
└── lib/                   # Axios, Supabase, Google Auth
```

---

## Structure du projet

```
Puurga/
├── src/                        # Frontend React
│   ├── components/
│   │   ├── Alliance/           # Système d'alliances
│   │   ├── Call/               # Appels audio/vidéo
│   │   ├── Games/              # Jeux intégrés (Slicer, Rift, Slot2…)
│   │   ├── GhostMode/          # Overlay et effets fantôme
│   │   ├── Onboarding/         # Parcours d'accueil
│   │   ├── Post/               # Création et affichage des posts
│   │   ├── Survival/           # Barre de survie, menaces, purge
│   │   ├── Sidebar/            # Widgets latéraux
│   │   └── UI/                 # Composants génériques (Button, Modal…)
│   ├── pages/
│   │   ├── Home.tsx            # Fil d'actualité
│   │   ├── Messages.tsx        # Messagerie
│   │   ├── PurgaGames/         # Catalogue de jeux
│   │   ├── Purgatory.tsx       # Zone purgatoire
│   │   ├── PuurgaDashboard.tsx # Tableau de bord
│   │   └── SuperAdmin/         # Administration
│   └── config/
│       └── puurgaGamesCatalog.ts
│
├── backend/                    # API Node.js
│   ├── routes/                 # 29 fichiers de routes
│   ├── services/
│   │   ├── survival/           # Moteurs survival (purge, threat, state…)
│   │   ├── creditService.ts
│   │   ├── notificationService.ts
│   │   └── pushNotificationService.ts
│   ├── middleware/
│   └── migrations/             # ~40 migrations SQL
│
├── public/                     # Assets statiques (images, jeux)
├── deployment/                 # Nginx, PM2, guides déploiement
├── docs/                       # Architecture messaging, règles dev
├── FEATURES_TO_FIX/            # 20 features partiellement implémentées
├── FEATURES_TO_CREATE/         # 12 features à créer
├── scripts/                    # Scripts utilitaires
└── .github/workflows/          # CI/CD GitHub Actions
```

---

## Installation et démarrage

### Prérequis

- **Node.js** 18+ (recommandé 20+)
- **npm** ou **yarn**
- Compte **Supabase** (URL, clé anon, service role)
- **PostgreSQL** (via Supabase ou local)

### 1. Cloner le dépôt

```bash
git clone https://github.com/VOTRE_ORG/Puurga.git
cd Puurga
```

### 2. Installer les dépendances

```bash
# Frontend (racine)
npm install

# Backend
cd backend
npm install
cd ..
```

### 3. Configurer les variables d'environnement

Voir la section [Variables d'environnement](#variables-denvironnement).

### 4. Lancer en développement

**Terminal 1 — Backend** (port 3005) :

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend** (port 5174) :

```bash
npm run dev
```

Le frontend proxy automatiquement `/api`, `/uploads` et `/ws` vers le backend via Vite.

### 5. Build production

```bash
# Frontend
npm run build          # → dist/

# Backend
cd backend
npm run build          # → dist/
npm start              # node dist/server.js
```

### Scripts backend utiles

```bash
npm run seed                    # Peupler des utilisateurs de test
npm run setup-admin             # Configurer un compte admin
npm run sync-users              # Synchroniser users → Supabase Auth
```

---

## Variables d'environnement

### Frontend (`.env` à la racine)

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon

# Appels vidéo ZegoCloud
VITE_ZEGO_APP_ID=votre-app-id
VITE_ZEGO_SERVER_SECRET=votre-server-secret
```

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://puurga:motdepasse@localhost:5432/puurga
JWT_SECRET=votre_secret_jwt_tres_long
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
NODE_ENV=development
PORT=3005
```

> **Important** : `JWT_SECRET` est obligatoire — le serveur refuse de démarrer sans lui.

---

## Routes frontend

### Routes publiques

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirige vers login ou onboarding |
| `/onboarding/video` | VideoScreen | Vidéo d'introduction |
| `/onboarding/language` | LanguageScreen | Choix de langue |
| `/onboarding/welcome` | WelcomeScreen | Écran de bienvenue |
| `/login` | Login | Connexion |
| `/register` | Register | Inscription |
| `/auth/callback` | AuthCallback | Callback OAuth Supabase |
| `/forgot-password` | ForgotPassword | Mot de passe oublié |
| `/reset-password` | ResetPassword | Réinitialisation mot de passe |

### Routes protégées (authentification requise)

| Route | Page | Description |
|-------|------|-------------|
| `/home` | Home | Fil d'actualité |
| `/profile` | Profile | Mon profil |
| `/profile/:username` | UserProfile | Profil public |
| `/messages` | Messages | Messagerie |
| `/notifications` | Notifications | Centre de notifications |
| `/groups` | Groups | Liste des groupes |
| `/groups/:id` | GroupDetail | Détail d'un groupe |
| `/join/:inviteCode` | JoinGroup | Rejoindre un groupe |
| `/puurga-games` | PurgaGames | Catalogue de jeux |
| `/puurga-dashboard` | PuurgaDashboard | Tableau de bord |
| `/purgatory` | Purgatory | Zone purgatoire |
| `/settings` | Settings | Paramètres |
| `/security` | Security | Sécurité du compte |
| `/help` | Help | Aide |
| `/admin/users` | UserList | Admin utilisateurs |
| `/super-admin` | SuperAdmin | Super administration |
| `/new-game` | NewGameCode | Jeu Redemption |
| `/next-game` | TheNextGame | Jeu The Watchman |

---

## API backend

Base URL : `http://localhost:3005/api` (dev) ou `https://www.puurga.com/api` (prod)

### Endpoints principaux

| Préfixe | Description |
|--------|-------------|
| `/api/auth` | Authentification (login, register, refresh) |
| `/api/users` | Profils, upload avatar/cover |
| `/api/posts` | CRUD posts, fil, réactions |
| `/api/comments` | Commentaires sur les posts |
| `/api/messages` | Messagerie directe |
| `/api/typing` | Indicateurs de frappe |
| `/api/friends` | Liste d'amis |
| `/api/friend-requests` | Demandes d'amis |
| `/api/groups` | Groupes et membres |
| `/api/notifications` | Notifications |
| `/api/statuses` | Stories / statuts |
| `/api/status` | Statut en ligne |
| `/api/credits` | Système de crédits |
| `/api/games` | Jeux et scores |
| `/api/purging` | Actions de purge |
| `/api/purges` | Historique des purges |
| `/api/purgatory` | Purgatoire et rédemption |
| `/api/survival` | État de survie, menaces, réputation |
| `/api/alliances` | Alliances et soutien |
| `/api/redeem` | Rédemption ghost mode |
| `/api/settings` | Paramètres utilisateur |
| `/api/security` | Événements de sécurité |
| `/api/media` | Upload et gestion médias |
| `/api/links` | Prévisualisation de liens |
| `/api/admin` | Super admin |

### Santé du serveur

```
GET /health
GET /api/health
```

### Authentification API

Les routes protégées utilisent un token JWT dans le header :

```
Authorization: Bearer <token>
```

Le middleware `validateNotGhosted` bloque les utilisateurs en ghost mode sur les actions sensibles (posts, messages, commentaires).

---

## Systèmes métier

### 1. Système de survie (Survival)

Moteur multi-composants dans `backend/services/survival/` :

| Moteur | Rôle |
|--------|------|
| `SurvivalEngine` | Orchestration globale de l'état de survie |
| `ThreatEngine` | Calcul du niveau de menace |
| `ReputationEngine` | Score de réputation |
| `InactivityEngine` | Détection d'inactivité |
| `PurgeEngine` | Conséquences des purges |
| `PurgatoryEngine` | Gestion du purgatoire |
| `StateEngine` | Transitions d'état |

Tables SQL : `user_survival_state`, `survival_events`, `survival_history`, `redemption_requests`, `purge_cooldowns`.

Frontend : `SurvivalContext`, `SurvivalStatusBar`, `ThreatMeter`, `PurgePressureMeter`, `EmotionalFeedback`.

### 2. Ghost Mode

Lorsqu'un utilisateur accumule trop de purges, il entre en **mode fantôme** :

- Overlay visuel avec effets (fantômes volants, toile d'araignée)
- Restrictions : pas de posts, commentaires, messages
- Possibilité de demander une **rédemption** via le purgatoire
- Les **alliés** peuvent soutenir (endorsement, sacrifice de réputation/visibilité)

Fichiers clés :
- `src/hooks/useGhostMode.ts`
- `src/components/GhostMode/`
- `backend/middleware/restrictGhosted.ts`
- `backend/routes/redemption.ts`

### 3. Système de crédits (Purga Points)

Service : `backend/services/creditService.ts`

| Action | Crédits |
|--------|---------|
| Créer un post | +5 |
| Liker | +1 |
| Recevoir un like | +2 |
| Commenter | +2 |
| Recevoir un commentaire | +3 |
| Connexion quotidienne | +3 |
| Bonus de récupération | +10 |

Plafonds journaliers : 20 likes, 10 commentaires, 150 crédits max/jour.

### 4. Jeux intégrés

Catalogue défini dans `src/config/puurgaGamesCatalog.ts` :

| Jeu | Type | Description |
|-----|------|-------------|
| **Judgment** (Purga Slicer) | Embed | Jugement des âmes |
| **The Watchman** | Navigate | Défense de tourre |
| **Redemption** | Navigate | Scénarios moraux pour rédemption |
| **Purga Rift** | Embed (Three.js) | Jeu 3D intégré slot 1 |
| **Slot 2** | Embed | Second slot de jeu intégré |

### 5. Alliances

- Demande / acceptation / rupture d'alliance
- Actions de soutien pour utilisateurs ghostés
- Cooldowns entre actions
- Tables : `user_alliances`, `alliance_support_actions`, `alliance_cooldowns`

### 6. Groupes

- Création, invitations par code
- Administration (panel admin)
- Messages de groupe
- Tables : `groups`, `group_members`, `group_messages`

---

## Temps réel et WebSocket

### Architecture

- **Backend** : `backend/websocketManager.ts` (singleton)
- **Frontend** : `src/services/websocketService.ts` + `src/hooks/useWebSocket.ts`
- Connexion : `ws://localhost:3005/ws?token=<jwt>` (dev)

### Événements supportés

| Événement | Usage |
|-----------|-------|
| `message` | Nouveau message |
| `typing` | Indicateur de frappe |
| `notification` | Notification in-app |
| `profile_update` | Mise à jour profil / ghost status |
| `online_status` | Statut en ligne/hors ligne |
| `survival_update` | Changement d'état de survie |

### Contextes React temps réel

- `MessagesContext` — conversations et messages
- `NotificationContext` / `NotificationsContext` — notifications
- `SurvivalContext` — état de survie
- `MessageNotificationProvider` — popups de messages

---

## Internationalisation

**10 langues supportées** via i18next :

| Code | Langue |
|------|--------|
| `en` | Anglais |
| `fr` | Français |
| `es` | Espagnol |
| `pt` | Portugais |
| `zh` | Chinois |
| `ar` | Arabe |
| `hi` | Hindi |
| `sw` | Swahili |
| `zu` | Zoulou |
| `ss` | Siswati |

Fichiers de traduction : `src/i18n/locales/*.json`

Détection automatique via `localStorage` puis navigateur. Fallback : anglais.

---

## Déploiement

### Pipeline CI/CD

Push sur `main` → GitHub Actions → SSH vers DigitalOcean → `server-deploy.sh`

```
.gitHub/workflows/deploy.yml
```

Secrets GitHub requis :
- `droplet_ip`
- `ssh_private_key`

### Script de déploiement (`server-deploy.sh`)

1. `git fetch` + `reset --hard origin/main`
2. `npm install` (frontend + backend)
3. `npm run build` (frontend)
4. Mise à jour config Nginx
5. `pm2 restart` backend

### Configuration serveur

- **Chemin** : `/var/www/Puurga`
- **Nginx** : `deployment/nginx.conf`
- **PM2** : `deployment/ecosystem.config.cjs`
- **Port backend** : 3005

Guides détaillés :
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [deployment/DEPLOYMENT_GUIDE.md](./deployment/DEPLOYMENT_GUIDE.md)
- [deployment/QUICK_START.md](./deployment/QUICK_START.md)
- [INITIAL_SERVER_SETUP.md](./INITIAL_SERVER_SETUP.md)

---

## État du projet

### Fonctionnalités opérationnelles

- Authentification (email + Google OAuth via Supabase)
- Fil d'actualité, posts, commentaires, réactions
- Messagerie directe avec images
- Stories / statuts
- Amis et demandes d'amis
- Groupes (création, admin, invitations)
- Notifications temps réel
- Ghost mode et purgatoire
- Système de survie et alliances
- Crédits et récompenses
- Jeux (Purga Slicer, Purga Rift partiellement)
- Appels vidéo (ZegoCloud)
- Internationalisation (10 langues)
- Super admin et sécurité
- Déploiement automatisé

### Features à compléter (20)

Voir `FEATURES_TO_FIX/` — fonctionnalités à 85-95% :

**Priorité haute** : stats dashboard réelles, édition/suppression messages, jeux intégrés, blocage/mute utilisateurs

**Priorité moyenne** : chat de groupe, réactions messages, tagging posts, analytics, 2FA/OAuth, graphiques dashboard

**Priorité basse** : planification posts, brouillons, marketplace crédits

### Features à créer (12)

Voir `FEATURES_TO_CREATE/` — fonctionnalités manquantes :

**Priorité haute** : configuration appels vidéo

**Priorité moyenne** : infrastructure jeux, matchmaking, tournois, métriques engagement, chiffrement messages

**Priorité basse** : cercles d'amis, rappels anniversaire, auth biométrique

### Guide développeur

Consultez [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) pour les patterns d'intégration, les priorités et la checklist de tests.

---

## Documentation complémentaire

| Fichier | Sujet |
|---------|-------|
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Guide développeur complet |
| [FEATURE_COMPLETION_OVERVIEW.md](./FEATURE_COMPLETION_OVERVIEW.md) | Vue d'ensemble des features |
| [backend/API_DOCS.md](./backend/API_DOCS.md) | Documentation API |
| [docs/MESSAGING_ARCHITECTURE.md](./docs/MESSAGING_ARCHITECTURE.md) | Architecture messagerie |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Déploiement GitHub → DigitalOcean |
| [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) | Configuration CI/CD |
| [LANGUAGE_SWITCHING_GUIDE.md](./LANGUAGE_SWITCHING_GUIDE.md) | Changement de langue |
| [PASSWORD_RECOVERY_DOCS.md](./PASSWORD_RECOVERY_DOCS.md) | Récupération mot de passe |
| [GAMING_MONETIZATION_IMPLEMENTATION_PLAN.md](./GAMING_MONETIZATION_IMPLEMENTATION_PLAN.md) | Plan monétisation jeux |
| [OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md) | Rapport d'optimisation |

---

## Licence

ISC

---

*Dernière mise à jour : juillet 2026*
