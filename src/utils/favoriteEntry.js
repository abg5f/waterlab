/**
 * Construit la ligne `favorite_days` à partir du payload renvoyé par
 * FavoriteModal.onSave(payload). Centralisé pour être utilisé à la fois
 * depuis le calendrier et depuis la section "Sessions enregistrées".
 *
 * @param {object} payload — { date, conditions, comment, spot, species,
 *                             time_of_day, tide_period_type, tide_period_hour, photos }
 */
export function buildFavoriteEntry(payload) {
  const cond = payload.conditions
  return {
    date:             payload.date,
    comment:          payload.comment,
    spot:             payload.spot,
    species:          payload.species,
    moon_phase:       cond.moonPhase,
    moon_name:        cond.moonName,
    coeff_category:   cond.coeffCategory,
    tide_coeff:       cond.tideCoeff,
    pressure_trend:   cond.pressureTrend,
    fishing_score:    cond.fishingScore,
    time_of_day:      payload.time_of_day,
    tide_period_type: payload.tide_period_type,
    tide_period_hour: payload.tide_period_hour,
    photos:           payload.photos?.length ? payload.photos : [],
  }
}

/**
 * Sauvegarde (upsert) un favori à partir du payload du formulaire, en gérant
 * le déplacement (suppression de l'ancienne entrée) si la date a été corrigée.
 *
 * @param {Date}     originalDate  Date d'origine de la session (avant correction éventuelle)
 * @param {object}   payload       Payload de FavoriteModal.onSave
 * @param {Function} upsert        useFavorites().upsert
 * @param {Function} remove        useFavorites().remove
 */
export function saveFavoriteSession(originalDate, payload, { upsert, remove }) {
  const oldDateStr = originalDate.toISOString().split('T')[0]
  if (payload.dateChanged && payload.date !== oldDateStr) {
    remove(oldDateStr)
  }
  return upsert(buildFavoriteEntry(payload))
}
