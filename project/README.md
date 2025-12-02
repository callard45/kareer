# Kareer - Plateforme de Développement de Carrière

Kareer est une plateforme de développement de carrière pour les étudiants et les établissements d'enseignement.

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Lancement en développement
npm run dev

# Build de production
npm run build
```

## 🔧 Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

# Changelog

## [2025-11-28] Ajout E-Interview – Fonctionnalité Complète

### 📦 Nouvelles Tables Supabase

Création de 9 nouvelles tables pour stocker les données de l'E-Interview :

| Table | Description |
|-------|-------------|
| `interview_logs` | Historique des conversations avec l'IA |
| `profile_general` | Informations générales (nom, bio, objectifs) |
| `profile_education` | Parcours éducatif |
| `profile_work_experience` | Expériences professionnelles |
| `profile_skills` | Compétences techniques et soft skills |
| `profile_languages` | Langues parlées |
| `profile_projects` | Projets réalisés |
| `profile_certifications` | Certifications obtenues |
| `profile_sports` | Activités sportives et associatives |

**Migration :** `supabase/migrations/20251128000001_create_einterview_tables.sql`

### 🤖 Service Gemini AI

- **Fichier :** `src/lib/geminiService.ts`
- Communication avec l'API Gemini pour le chat
- Sauvegarde automatique des messages dans `interview_logs`
- Prompt système optimisé pour l'extraction de profil

### 🔍 Extracteur de Profil

- **Fichier :** `src/lib/profileExtractor.ts`
- Analyse des conversations pour extraire les données structurées
- Sauvegarde automatique dans les tables `profile_*`
- Récupération des données pour affichage

### 💬 Interface E-Interview

- **Fichier :** `src/screens/AIInterview/AIInterview.tsx`
- Interface de chat moderne avec indicateur de progression
- Intégration avec l'API Gemini en temps réel
- Bouton de sauvegarde du profil à la fin de l'interview
- Redirection automatique vers MyProfile après sauvegarde

### 👤 Page MyProfile Dynamique

- **Fichier :** `src/screens/Profile/Profile.tsx`
- **Hook :** `src/hooks/useProfileData.ts`
- Affichage des données dynamiques depuis Supabase
- Fallback sur les données statiques si pas d'interview
- Bannière incitant à faire l'E-Interview si profil vide

### ✅ Aucun Impact sur les Tables Existantes

- Aucune modification des tables existantes
- Toutes les nouvelles tables utilisent `user_id` comme clé étrangère
- Row Level Security (RLS) activé sur toutes les tables
- Policies pour accès utilisateur uniquement
