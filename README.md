# Kadea Chat

Kadea Chat est une application de messagerie accessible depuis un navigateur. Les utilisateurs peuvent échanger en privé ou en groupe, recevoir leurs messages en temps réel sans recharger la page, et retrouver leurs conversations à leur reconnexion.

Projet réalisé pour Kadea Academy dans le cadre du capstone de la formation développeur web, avec AdonisJS 7, Edge et PostgreSQL.

**Site hébergé :** https://kadea-chat-fullstack.onrender.com

> Le site est hébergé sur une formule gratuite de Render. Si personne ne l'a visité depuis un moment, la première page peut mettre environ une minute à s'afficher.

---

## Technologies

| Rôle                          | Outil                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| Framework back-end            | AdonisJS 7 (TypeScript)                                        |
| Vues                          | Edge (layouts et composants)                                   |
| Base de données               | PostgreSQL, avec l'ORM Lucid                                   |
| Temps réel                    | Transmit (Server-Sent Events), canaux privés par conversation  |
| Interactivité côté navigateur | Alpine.js                                                      |
| Validation                    | VineJS                                                         |
| E-mails                       | AdonisJS Mail : SMTP en développement, API Brevo en production |
| Hébergement                   | Render (service web et base PostgreSQL)                        |

---

## Fonctionnalités réalisées

### Comptes utilisateurs

- Création de compte (nom, adresse e-mail, mot de passe)
- E-mail de confirmation avec un lien à usage unique, valable 24 heures
- Connexion refusée tant que l'adresse e-mail n'est pas confirmée
- Connexion et déconnexion
- Réinitialisation du mot de passe par e-mail

### Conversations privées

- Démarrer une conversation avec un autre utilisateur (une seule conversation privée par paire d'utilisateurs)
- Liste des conversations avec le dernier message et sa date, triée de la plus récente à la plus ancienne
- Historique complet d'une conversation
- Accès refusé (403) à une conversation dont on ne fait pas partie

### Messages

- Envoi de messages texte, avec l'auteur et l'heure
- Réception en temps réel, sans actualiser la page
- Messages conservés après un rechargement ou une reconnexion
- Suppression d'un message envoyé, avec une indication à sa place (« Ce message a été supprimé le … »), visible en temps réel par les autres membres
- Modification d'un message envoyé, avec la mention « (modifié) », visible en temps réel

### Groupes

- Création d'un groupe avec un nom et plusieurs membres
- Échange de messages en temps réel entre les membres
- Seuls les membres peuvent lire les messages du groupe
- L'administrateur (le créateur) peut ajouter ou retirer des membres
- Un membre peut quitter le groupe (l'administrateur ne peut pas le quitter)
- Les changements de membres sont répercutés en temps réel sur la page du groupe

### Sécurité

- Mots de passe hachés
- Validation des données côté serveur (VineJS)
- Protection CSRF sur tous les formulaires, et sur les abonnements temps réel
- Liens de confirmation et de réinitialisation : seul le hachage du jeton est stocké, avec une date d'expiration et un usage unique
- Droits vérifiés à chaque accès à une conversation, à chaque envoi, modification et suppression de message, et à chaque abonnement temps réel
- Les messages reçus en direct sont affichés comme du texte (protection contre l'injection de code)

---

## Fonctionnalités en cours ou à venir

- Modification du profil (nom, photo, mot de passe)
- Recherche d'un utilisateur par nom
- Identité visuelle propre à Kadea Chat, interface adaptée au téléphone, textes entièrement en français
- Mise à jour en direct de la liste des conversations sur le tableau de bord
- Fonctionnalités avancées : statut des messages (envoyé, reçu, lu), présence en ligne et saisie en cours, partage de fichiers, recherche dans les messages, blocage d'un utilisateur

---

## Installation et lancement en local

### Prérequis

- Node.js 20.6 ou plus récent
- PostgreSQL
- Un compte SMTP de test pour recevoir les e-mails de confirmation (par exemple Mailtrap)

### Étapes

```bash
# 1. Récupérer le code
git clone <url-du-depot>
cd <nom-du-dossier>

# 2. Installer les dépendances
npm install

# 3. Créer le fichier d'environnement
cp .env.example .env

# 4. Générer la clé de l'application et la copier dans APP_KEY (dans .env)
node ace generate:key
```

Crée ensuite une base de données PostgreSQL vide, puis renseigne le fichier `.env` (voir le tableau ci-dessous). Pour un lancement en local, utilise :

```
NODE_ENV=development
HOST=localhost
APP_URL=http://localhost:3333
MAIL_MAILER=smtp
```

Puis :

```bash
# 5. Créer les tables
node ace migration:run

# 6. Lancer l'application
node ace serve --hmr
```

L'application est disponible sur http://localhost:3333.

---

## Variables d'environnement

Le fichier `.env.example` liste toutes les variables, sans valeurs secrètes.

| Variable                                                   | Rôle                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `TZ`                                                       | Fuseau horaire du serveur (`UTC`)                                      |
| `PORT`                                                     | Port d'écoute (`3333` en local ; défini par l'hébergeur en production) |
| `HOST`                                                     | Adresse d'écoute (`localhost` en local, `0.0.0.0` en production)       |
| `NODE_ENV`                                                 | `development` ou `production`                                          |
| `LOG_LEVEL`                                                | Niveau de journalisation (`info`)                                      |
| `APP_KEY`                                                  | Clé secrète de l'application (à générer avec `node ace generate:key`)  |
| `APP_URL`                                                  | Adresse publique du site, utilisée dans les liens des e-mails          |
| `SESSION_DRIVER`                                           | Stockage des sessions (`cookie`)                                       |
| `DB_HOST`                                                  | Hôte de la base PostgreSQL                                             |
| `DB_PORT`                                                  | Port de la base (`5432`)                                               |
| `DB_USER`                                                  | Utilisateur de la base                                                 |
| `DB_PASSWORD`                                              | Mot de passe de la base                                                |
| `DB_DATABASE`                                              | Nom de la base                                                         |
| `MAIL_MAILER`                                              | `smtp` (développement) ou `brevo` (production)                         |
| `MAIL_FROM_NAME`                                           | Nom de l'expéditeur des e-mails                                        |
| `MAIL_FROM_ADDRESS`                                        | Adresse de l'expéditeur (vérifiée chez Brevo en production)            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | Identifiants du serveur SMTP                                           |
| `BREVO_API_KEY`                                            | Clé d'API Brevo (production uniquement)                                |

---

## Base de données

Tables principales : utilisateurs, conversations, membres des conversations, messages, et jetons de confirmation et de réinitialisation.
Le dictionnaire de données, le MCD et le MLD sont disponibles ici : [https://app.diagrams.net/#G1hitR1VSEhR9bL-SC2h2WWD7Znpluehbm#%7B%22pageId%22%3A%22JlURHSjAnfij32zXeUML%22%7D]

Points de conception :

- **Un seul type de conversation** pour le privé et le groupe : un message appartient à une conversation, quelle que soit sa nature.
- **`private_key`** (par exemple `3:7`, les deux identifiants triés) est unique : il empêche deux conversations privées entre les mêmes personnes.
- **`conversation_members`** est la table qui décide de l'accès : elle contient le rôle (`admin` ou `member`) et `left_at`, rempli quand quelqu'un quitte un groupe ou en est retiré, ce qui conserve l'historique.
- **`deleted_at`** : un message supprimé n'est pas effacé, il est marqué, pour pouvoir afficher l'indication à sa place.

---

## Temps réel

Le serveur utilise Transmit (Server-Sent Events). Chaque conversation a son propre canal, `conversations/:id/messages`, sur lequel sont diffusés les nouveaux messages, les suppressions, les modifications et les changements de membres. L'abonnement à un canal est autorisé uniquement aux membres de la conversation (même règle que pour l'affichage de la page).

---

## Déploiement

L'application est déployée sur Render, depuis la branche `main`.

- **Build :** `npm ci --include=dev && node ace build && cd build && npm ci --omit=dev`
- **Démarrage :** `cd build && node ace migration:run --force && node bin/server.js`
- Les variables d'environnement sont renseignées dans les réglages de l'hébergeur, pas dans le dépôt.
- En production, les e-mails passent par l'API de Brevo : les services web gratuits de Render ne peuvent pas utiliser les ports SMTP.

---

## Scénario de démonstration

1. Créer un premier compte et recevoir l'e-mail de confirmation.
2. Confirmer l'adresse, puis se connecter.
3. Créer et confirmer un deuxième compte de la même manière.
4. Ouvrir les deux comptes dans deux navigateurs.
5. Démarrer une conversation et envoyer un message : le deuxième compte le reçoit sans actualiser la page.
6. Recharger les pages : la conversation et les messages sont conservés.
7. Créer un groupe et échanger des messages entre ses membres.
8. Vérifier qu'un utilisateur extérieur n'accède pas aux messages d'une conversation dont il n'est pas membre (erreur 403).

---

## Auteur

Barthélemy Nsiala
