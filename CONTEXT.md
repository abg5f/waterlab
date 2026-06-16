# Context — WaterLab

> Dernière mise à jour : 2026-06-16

## État actuel

- App PWA de pêche (Martinique) déployée sur Vercel : `waterlab-five.vercel.app`
- Calendrier de conditions de pêche (lune, coeff marée, pression, score), onglet "Jours similaires" basé sur les sessions enregistrées
- Section **"Sessions enregistrées"** (menu burger) : liste des favoris avec détail, conditions, photos, jours similaires à venir
- Les sessions enregistrées sont **modifiables** depuis leur fiche détail (bouton "✏️ Modifier") — spot, espèce, créneau, photos, commentaire, correction de date
- Upload de **photos** (max 5/session) vers Supabase Storage bucket `session-photos`
- Supabase + localStorage fallback pour `favorite_days`, `tide_cache`, `spots`
- PIN de protection pour l'accès aux favoris/sessions
- **GitHub Actions keep-alive** en place : ping Supabase chaque lundi 8h UTC → évite la mise en pause automatique du plan gratuit

## Décisions prises

- `FavoriteModal` extrait en composant standalone (`src/components/FavoriteModal.jsx`) pour être réutilisé depuis le calendrier ET depuis "Sessions enregistrées"
- Logique de sauvegarde centralisée dans `src/utils/favoriteEntry.js` (`buildFavoriteEntry` + `saveFavoriteSession`) — gère le "déplacement" d'une session si la date est corrigée
- Sélection d'une session dans `SavedSessionsPanel` basée sur **dateStr** (pas objet figé) + dérivée via `useMemo` depuis le tableau live `favorites` — évite les références périmées après modification
- Onglet "Jours similaires" calé sur le **mois affiché** dans le calendrier (pas les 16 prochains jours fixes)
- App sans Supabase Auth — toutes les politiques RLS utilisent `TO anon USING (true) WITH CHECK (true)` (usage personnel)
- Clé API Supabase stockée dans `localStorage` (`wl_supabase_key`) via Admin panel — **prioritaire sur la variable d'environnement Vercel** → si les clés sont régénérées côté Supabase, il faut recoller la nouvelle clé dans Paramètres de l'app
- Keep-alive via GitHub Actions (pas de solution serveur) — le refresh hebdomadaire des marées dans `useTides.js` est client-side uniquement (ne suffit pas)

## En cours / TODOs

- Rien en cours — toutes les features demandées cette session sont terminées et déployées
- Piste future : ajouter des sessions favorites pour augmenter le nombre de "Références" dans les jours similaires

## Problèmes connus

- Si la clé anon Supabase est régénérée dans le dashboard, la valeur en `localStorage` du navigateur devient périmée → erreur silencieuse `401` sur `favorite_days` + `400 signature verification failed` sur Storage. Fix : Paramètres → recoller la clé `anon` actuelle depuis Project Settings → API.
- La pression atmosphérique n'est pas disponible pour les dates passées → tendance "neutre" par défaut dans les conditions recalculées lors d'une correction de date.
- Supabase plan gratuit : projet mis en pause après 7 jours d'inactivité → résolu par le GitHub Actions keep-alive

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `src/components/FavoriteModal.jsx` | Formulaire ajout/modif session (extraction depuis FishingCalendar) |
| `src/utils/favoriteEntry.js` | `buildFavoriteEntry` + `saveFavoriteSession` — logique de sauvegarde partagée |
| `src/components/SavedSessions.jsx` | Panneau sessions enregistrées : liste, détail, bouton "✏️ Modifier" |
| `src/components/FishingCalendar.jsx` | Calendrier principal + onglet "Jours similaires" (mois courant) |
| `src/hooks/useFavorites.js` | Hook Supabase + localStorage fallback — expose `upsert`, `remove`, `isFavorite` |
| `src/hooks/useTides.js` | Refresh marées : cache mensuel Supabase + refresh client-side dimanche uniquement |
| `src/lib/supabase.js` | Client Supabase + helpers photo (`uploadSessionPhoto`, `deleteSessionPhoto`) |
| `src/utils/conditions.js` | `buildConditionsGetter(tidesData, weatherData)` — réutilisé hors calendrier |
| `src/utils/similarity.js` | `findSimilarDays`, `compareDays`, `SIMILARITY_THRESHOLD` |
| `.github/workflows/keep-alive.yml` | Cron GitHub Actions (lundi 8h UTC) — ping Supabase pour éviter la mise en pause |
| `supabase-schema.sql` | Schéma SQL à jour (tables + RLS anon) — **ne contient pas encore** la migration photos |

### Migration photos non committée (à exécuter manuellement dans Supabase SQL Editor si projet recréé)
```sql
ALTER TABLE favorite_days ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
-- Bucket session-photos : créer via Dashboard Storage > New bucket (public)
-- Policies sur storage.objects :
INSERT INTO storage.buckets (id, name, public) VALUES ('session-photos', 'session-photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "anon_upload_photos" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'session-photos');
CREATE POLICY "anon_update_photos" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'session-photos');
CREATE POLICY "anon_delete_photos" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'session-photos');
CREATE POLICY "public_read_photos"  ON storage.objects FOR SELECT TO public USING (bucket_id = 'session-photos');
```

### GitHub Actions secrets requis
| Secret | Valeur |
|---|---|
| `SUPABASE_URL` | `https://idzykolacaekuswfjomu.supabase.co` |
| `SUPABASE_ANON_KEY` | clé anon depuis Supabase > Project Settings > API |

---
_Mis à jour via `/save`. Lire ce fichier en début de session pour reprendre le contexte._
