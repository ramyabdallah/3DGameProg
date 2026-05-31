# ia-edition-drowned-archive

# THE DROWNED ARCHIVE
Jeu d’horreur psychologique sous-marin en 3D développé avec Babylon.js.  
Projet réalisé pour le module **3D Game Programming** à l’Université Côte d’Azur.

Code source : (https://github.com/ramyabdallah/3DGameProg.git)
Lien Youtube: https://youtu.be/UlV6IEJEAO4
Jeu hébergé: https://drowned-archive.netlify.app/

---

# L’équipe

| Ramy ABDALLAH | Gameplay, IA, environnement, UI, audio | Fier du système de poursuite du monstre et de l’ambiance horrifique progressive |

---

# Comment lancer le jeu en local

Le projet utilise Vite et TypeScript

## Installation

npm install

## Lancement du projet

npm run dev

puis lancer l'URL donné

# Pourquoi j’ai choisi ce jeu

Je voulais créer une expérience immersive et stressante inspirée des jeux d’horreur psychologique comme *SOMA* ou *Subnautica*.  
L’objectif était de construire une ambiance où le joueur ressent constamment la pression de l’environnement sous-marin, du manque d’oxygène et de la présence d’une créature qui le traque dans les profondeurs.

---

### Contexte du jeu

Le joueur explore une ancienne archive engloutie abandonnée au fond de l’océan Pacifique.  
Au fur et à mesure de l’exploration, une créature appelée **The Drowned Maw** détecte la présence du joueur et commence à le traquer intelligemment dans les couloirs du complexe.

L’atmosphère évolue progressivement :
- ambiance calme au début,
- montée du stress après récupération des artefacts,
- poursuite horrifique dans la seconde moitié du jeu.

### Dans la mécanique du jeu

Le monstre utilise un système d’IA basé sur :
- des waypoints,
- un pathfinding simplifié,
- une logique de poursuite dynamique,
- des collisions complètes avec l’environnement.

Le Maw ne suit pas simplement le joueur en ligne droite : il navigue dans l’archive en utilisant des chemins définis selon la structure du bâtiment.

---

# Comment jouer

## Matériel

Le jeu se joue :
- au clavier + souris,
- sans manette,
- sur ordinateur portable ou PC fixe.
- avec un casque ou des écouteurs fortement recommandés pour profiter pleinement de l’ambiance sonore et des effets d’horreur.

Compatible AZERTY et QWERTY.

---

# Contrôles

| Touche | Action |
|---|---|
| W / Z | Avancer |
| S | Reculer |
| A / Q | Aller à gauche |
| D | Aller à droite |
| SHIFT | Sprint |
| SPACE | Monter |
| CTRL | Descendre |
| E | Interagir / ramasser / ouvrir les portes |
| ESC | Pause |

---

# Objectif

Le joueur doit :
1. Explorer l’archive engloutie,
2. Trouver les 5 artefacts perdus,
3. Survivre à la créature,
4. Réussir à quitter le bâtiment vivant.

### Exploration sous-marine immersive
Le joueur navigue librement dans une immense archive abandonnée au fond de l’océan.

### Gestion de l’oxygène
L’oxygène diminue progressivement durant l’exploration, ajoutant une pression constante.

### Ambiance horrifique dynamique
La musique, les effets sonores et les effets visuels évoluent selon la progression du joueur et l’état du monstre.

### IA du monstre
Le **Drowned Maw** poursuit le joueur à travers le bâtiment via un système de waypoints et de collisions.

### Interaction avec l’environnement
Le joueur peut :
- ouvrir des portes,
- récupérer des artefacts,
- explorer différentes salles et étages.

### Menus interactifs
Le jeu contient :
- menu principal,
- menu pause,
- écran de victoire,
- écran de défaite,
- système d’objectifs dynamique.

### Narration et mise en scène
Le jeu contient :
- une introduction narrative avec effet machine à écrire,
- une musique spécifique au menu principal,
- des transitions cinématiques,
- des écrans de fin sous forme d'articles de journal.

---

# Respect du Thème IA

# Respect du thème

Le thème IA a est interprété par le mouvement du monstre "The Drowned Maw". Il poursuit le joueur à travers le deuxième niveau du batîment
à l'aide d'un système de waypoints et de collisions. En détectant la position du joueur, le monstre prend le plus court chemin de la 
position de son waypoint, jusqu'à celui le plus proche du joueur, ce qui permet une poursuite intense sans arrêt de l'arrivée du joueur à 
cet étage, jusqu'à la fin du jeu.

---

# Défis et décisions

## Atmosphère sous-marine

L’un des objectifs principaux était de créer une vraie sensation de profondeur et d’oppression :
- brouillard volumétrique,
- éclairage bleuté,
- faible visibilité,
- particules de bulles,
- lumières dynamiques.

---

## IA de poursuite

Le plus gros défi du projet a été l’IA du monstre.

Au départ, le monstre suivait simplement le joueur directement, ce qui causait :
- des collisions avec les murs,
- des mouvements irréalistes,
- des blocages dans les couloirs.

La solution finale utilise :
- un réseau de waypoints,
- un système de pathfinding simplifié,
- des collisions environnementales,
- une adaptation dynamique de la hauteur.

---

## Audio

Le jeu possède plusieurs états audio :
- ambiance calme,
- montée de tension,
- poursuite,
- rugissements du monstre.

Les transitions audio changent selon :
- le nombre d’artefacts récupérés,
- l’état du monstre,
- les phases du gameplay.

Il existe aussi des effets sonores et de l'ambiance audio pour:
- le ramassement des artefacts,
- L'ouvrage et fermeture des portes,
- la page principale,
- l'écriture de texte dans l'introduction,
- le clic des boutons.

---

## Gestion des collisions

Le projet utilise les collisions Babylon.js pour :
- empêcher le joueur et le monstre de traverser les murs et le sol,
- gérer les déplacements dans les escaliers,
- empêcher les sorties hors de la map.

---

## Menus et UI

L’interface du jeu a été entièrement développée en HTML/CSS :
- HUD,
- objectifs dynamiques,
- menus,
- effets de poursuite,
- animations d’alerte,
- introduction,
- fenêtre de fin de jeu.

---

## Histoire de développement

# Histoire du développement

Le projet a commencé par une simple idée d'exploration sous-marine. Les premiers prototypes contenaient uniquement le terrain, une caméra libre et quelques objets de test.

Une grande partie du développement a ensuite été consacrée à la modélisation du bâtiment principal sur Blender. Cette étape a représenté l'un des plus gros investissements en temps du projet.

Le Drowned Maw a également demandé plusieurs itérations. Le comportement initial consistait simplement à suivre directement le joueur, ce qui provoquait de nombreux blocages dans l'environnement. Le système final utilise un réseau de waypoints permettant une poursuite plus crédible dans les couloirs de l'archive.

Au fil du développement, plusieurs systèmes ont été ajoutés :

- gestion de l'oxygène,
- collecte d'artefacts,
- système audio dynamique,
- menus interactifs,
- séquences d'introduction et de fin,
- poursuite du monstre,
- effets visuels d'ambiance.

Le résultat final est une expérience d'exploration horrifique centrée sur l'atmosphère, la tension progressive et la découverte.


---

## difficultés mémorables

Concernant le monstre:

- il traversait les murs,
- restait bloqué dans les étagères,
- ou passait à travers les étages.
- Une prise de temps trop large pour effectuer de l'animation pour le mouvement du monstre.

Le système de waypoints et les collisions ont dû être entièrement repensés plusieurs fois avant d’obtenir un comportement stable.


Concernant le Batiment:

- Galère immense sur la modélisation du bâtiment et le reste des modèles sur Blender.

---

# Architecture technique

| Élément | Détail |
|---|---|
| Moteur | Babylon.js |
| Langage | TypeScript |
| Build Tool | Vite |
| Audio | HTML5 Audio |
| Assets 3D | Blender (.glb) + Mixamo + Sketchfab |
| IA | Pathfinding simplifié + waypoints |
| UI | HTML / CSS |

---

# Fichiers principaux

public/
 └── assets/ 
 ├── audio/ → musiques, sons de portes, rugissements du Maw 
 ├── models/ → archive.glb, modèles 3D du jeu 
 ├── textures/ → textures et matériaux 
 └── main_menu.png → arrière-plan du menu principal

src/
 ├── main.ts → point d'entrée du jeu 
 ├── app.ts → moteur du jeu 
 ├── style.css → style graphique et HUD 
 ├── gameplay/
 │ ├── ArchiveLoader.ts → chargement de l'archive, des modèles et des animations 
 │ ├── DoorSystem.ts → gestion des portes interactives et de leurs animations 
 │ ├── EscapeSystem.ts → gestion de la victoire et de la sortie de l'archive 
 │ ├── ArtifactSystem.ts → collecte et suivi des artefacts 
 │ └── OxygenSystem.ts → gestion de l'oxygène du joueur 
 ├── audio/ 
 │ ├── AudioManager.ts → gestion des musiques et effets sonores 
 ├── ui → interface utilisateur et menus 
 └── types/ 
 │ ├── GameTypes.ts → types et structures de données partagés 
 ├── world/ 
 │ ├── WorldBuilder.ts → création et configuration de l'environnement 3D 
 ├── player/ 
 │ ├── PlayerController.ts → contrôles du joueur, caméra, déplacements et interactions 
 ├── monster/ 
 ├── MonsterController.ts → IA du Drowned Maw, pathfinding, poursuite et capture du joueur 
 ├── MonsterWaypoints.ts → définition des points de passage et connexions du pathfinding
