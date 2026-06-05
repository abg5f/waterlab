import StarRating from './StarRating'

/* ── « Comment ça marche » : explication du score d'activité ── */
export default function HowItWorks() {
  return (
    <div className="hiw">
      <p className="hiw-intro">
        Chaque jour reçoit une note d'activité des poissons de <strong>1 à 3 étoiles</strong>.
        Elle combine trois facteurs naturels qui influencent réellement le comportement
        des poissons : la <strong>lune</strong>, la <strong>pression atmosphérique</strong> et
        la <strong>marée</strong>.
      </p>

      {/* Facteur Lune */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌙</span>
          <h4>La Lune</h4>
          <span className="hiw-pts">0 → 3 pts</span>
        </div>
        <p className="hiw-why">
          La Lune commande les marées et la luminosité nocturne. Autour de la
          <strong> nouvelle lune</strong> et de la <strong>pleine lune</strong>, les marées
          sont les plus fortes (vive-eau) : les courants brassent davantage la nourriture
          et déclenchent des phases d'alimentation intenses. C'est le principe des tables
          solunaires bien connues des pêcheurs.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+3</span> Pleine lune 🌕 ou nouvelle lune 🌑 — activité maximale</li>
          <li><span className="hiw-badge mid">+2</span> Phases intermédiaires (croissant, gibbeuse)</li>
          <li><span className="hiw-badge low">+1</span> Premier / dernier quartier 🌓🌗 — activité plus faible</li>
        </ul>
      </div>

      {/* Facteur Pression */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌡️</span>
          <h4>La pression atmosphérique</h4>
          <span className="hiw-pts">0 → 2 pts</span>
        </div>
        <p className="hiw-why">
          Les poissons perçoivent les variations de pression via leur vessie natatoire.
          Une pression <strong>stable ou en hausse</strong> annonce du beau temps et les
          rend actifs. Une <strong>chute de pression</strong> (arrivée d'une perturbation)
          les rend apathiques : ils se mettent à l'abri et se nourrissent moins.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+2</span> Pression en hausse nette — poissons actifs</li>
          <li><span className="hiw-badge mid">+1</span> Pression stable</li>
          <li><span className="hiw-badge low">0</span> Pression en baisse — poissons apathiques</li>
        </ul>
      </div>

      {/* Facteur Marée */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌊</span>
          <h4>La marée (coefficient)</h4>
          <span className="hiw-pts">0 → 3 pts</span>
        </div>
        <p className="hiw-why">
          Plus le coefficient est élevé (<strong>vive-eau</strong>), plus l'eau se déplace :
          les courants remettent la nourriture en mouvement et stimulent les prédateurs.
          La note est <strong>relative à ton spot</strong> : l'app compare chaque jour aux
          autres jours du lieu (tertiles), pour que le système s'adapte aussi bien aux
          fortes marées atlantiques qu'aux marées plus faibles des Caraïbes.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+3</span> <span className="coeff-spring hiw-cf">Vive-eau locale</span> — tiers des plus forts coefficients</li>
          <li><span className="hiw-badge mid">+2</span> <span className="coeff-medium hiw-cf">Marée moyenne</span> — tiers médian</li>
          <li><span className="hiw-badge low">+1</span> <span className="coeff-neap hiw-cf">Morte-eau locale</span> — tiers des plus faibles</li>
        </ul>
      </div>

      {/* Calcul final */}
      <div className="hiw-factor hiw-total">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">⭐</span>
          <h4>Le calcul des étoiles</h4>
        </div>
        <p className="hiw-why">
          On additionne les trois facteurs (jusqu'à <strong>8 points</strong> quand les
          marées sont disponibles), puis on convertit en étoiles selon le pourcentage atteint :
        </p>
        <div className="hiw-stars-table">
          <div className="hiw-star-row">
            <StarRating score={3} size="sm" />
            <span className="hiw-star-thr">≥ 75 % (6+ pts)</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--green)' }}>Excellente activité</span>
          </div>
          <div className="hiw-star-row">
            <StarRating score={2} size="sm" />
            <span className="hiw-star-thr">≥ 42 % (≈ 3,5+ pts)</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--gold)' }}>Bonne activité</span>
          </div>
          <div className="hiw-star-row">
            <StarRating score={1} size="sm" />
            <span className="hiw-star-thr">en dessous</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--text2)' }}>Faible activité</span>
          </div>
        </div>
      </div>

      <p className="hiw-disclaimer">
        ⚠️ Ces notes sont une aide à la décision basée sur des tendances générales.
        La météo locale, le vent, la température de l'eau et ton expérience du spot
        restent déterminants. Note tes belles sessions en favoris ⭐ : l'onglet
        « Jours similaires » retrouvera les jours à conditions comparables.
      </p>
    </div>
  )
}
