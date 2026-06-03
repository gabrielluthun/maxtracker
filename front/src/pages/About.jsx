import { ShieldAlert, Github, ExternalLink } from "lucide-react";

const GITHUB_REPO_URL = "https://github.com/gabrielluthun/tgvmax-platform";

const ABOUT_FILTER_SECTIONS = [
  {
    title: "Filtres simples",
    intro:
      "Section ouverte par défaut dans le panneau latéral (ou la feuille mobile). Une seule section (simple ou avancée) peut être dépliée à la fois.",
    filters: [
      {
        name: "Type de train",
        effect:
          "TGV INOUI / OUIGO, Intercités, Intercités de nuit. Au moins un type doit rester actif.",
      },
      {
        name: "Correspondances max",
        effect:
          "Direct (défaut) : trajets sans changement de train. 1 ou 2 : inclut les parcours composés avec jusqu'à une ou deux correspondances (3 trains au total).",
      },
    ],
  },
  {
    title: "Filtres avancés",
    intro:
      "Section repliée par défaut ; elle s'ouvre automatiquement si un filtre avancé (hors horizon à 30 j) est actif.",
    filters: [
      {
        name: "Horizon de dates",
        effect:
          "Limite l'affichage aux 7, 14 ou 30 prochains jours (défaut : 30 j). Réduit le volume de résultats sans changer la base indexée.",
      },
      {
        name: "Créneaux horaires",
        effect:
          "Matin (avant 12 h), après-midi (12 h–18 h), soir (à partir de 18 h). Au moins un créneau doit rester actif.",
      },
      {
        name: "Durée totale max",
        effect:
          "Porte à porte (trajet + attentes en gare) : ≤ 3 h, 5 h ou 8 h. Utile pour les allers-retours à la journée, y compris avec correspondance.",
      },
      {
        name: "Départ aujourd'hui",
        effect:
          "Ne conserve que les trajets dont la date de départ est aujourd'hui (fuseau Europe/Paris). Les départs déjà passés sont toujours exclus.",
      },
      {
        name: "Week-end uniquement",
        effect: "Samedis et dimanches seulement.",
      },
    ],
  },
  {
    title: "Actions",
    filters: [
      {
        name: "Masquer une destination",
        effect:
          "Retire une ville de vos résultats (stockage local). Réversible via « Réafficher tout » dans le panneau filtres.",
      },
    ],
  },
];

function FilterTable({ section }) {
  return (
    <div className="mt-6 first:mt-0">
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">{section.title}</h4>
      {section.intro ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{section.intro}</p>
      ) : null}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-left">
          <caption className="sr-only">{section.title} — filtres MaxTracker</caption>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
              <th scope="col" className="px-4 py-3 font-semibold w-[11rem] sm:w-[13rem]">
                Filtre
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Effet
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {section.filters.map((row) => (
              <tr key={row.name} className="text-slate-600 dark:text-slate-400">
                <th
                  scope="row"
                  className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 align-top"
                >
                  {row.name}
                </th>
                <td className="px-4 py-3 align-top leading-relaxed">{row.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <main
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16 text-base text-slate-600 dark:text-slate-400 leading-relaxed"
      data-testid="about-page"
    >
      <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] dark:text-slate-100 tracking-tight">
        À propos
      </h1>

      <section
        id="le-projet"
        className="mt-10 scroll-mt-24"
        aria-labelledby="about-le-projet"
        data-testid="about-section-projet"
      >
        <h2 id="about-le-projet" className="text-3xl font-bold text-[#0A2540] dark:text-slate-100">
          Le projet
        </h2>
        <div className="mt-4 space-y-4">
          <p>
            <strong className="text-slate-800 dark:text-slate-200">MaxTracker</strong> aide les titulaires d'un
            abonnement <strong className="text-slate-800 dark:text-slate-200">MAX Jeune ou MAX Senior</strong> (offres
            TGV Max) à repérer plus vite les trajets éligibles à{" "}
            <strong className="text-slate-800 dark:text-slate-200">0 €</strong> sur les{" "}
            <strong className="text-slate-800 dark:text-slate-200">30 prochains jours</strong>, depuis la gare de leur
            choix — en direct ou avec correspondance.
          </p>
          <p>
            L'outil agrège et filtre les disponibilités publiées dans les données ouvertes SNCF, compose des parcours
            multi-segments lorsque les horaires s'enchaînent, puis vous oriente vers{" "}
            <a
              href="https://www.sncf-connect.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#0A2540] dark:hover:text-slate-200"
            >
              SNCF Connect
            </a>{" "}
            pour réserver. <br /> <br />C'est un <strong className="text-slate-800 dark:text-slate-200">outil d'optimisation de recherche</strong> et pas un canal de vente.
          </p>
          <p>
            MaxTracker est <strong className="text-slate-800 dark:text-slate-200">gratuit</strong>,{" "}
            <strong className="text-slate-800 dark:text-slate-200">indépendant et non affilié à la SNCF</strong>. Il ne
            vend pas de billets, ne collecte aucun identifiant SNCF Connect et ne réalise aucune réservation.
          </p>
        </div>
      </section>

      <section
        id="comment-ca-marche"
        className="mt-10 scroll-mt-24"
        aria-labelledby="about-comment-ca-marche"
        data-testid="about-section-comment-ca-marche"
      >
        <h2 id="about-comment-ca-marche" className="text-3xl font-bold text-[#0A2540] dark:text-slate-100">
          Comment ça marche
        </h2>
        <div className="mt-4 space-y-6">
          <p>
            MaxTracker part d'une seule question : <em>« Quels trajets TGV Max à 0 € puis-je prendre depuis ma gare dans
            le mois qui vient ? »</em> Voici le parcours, de la saisie de la gare jusqu'à la réservation sur le canal
            officiel.
          </p>

          <ol className="space-y-6 list-decimal list-outside ml-5 marker:font-semibold marker:text-[#0A2540] dark:marker:text-slate-300">
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Choisissez votre gare de départ.</strong>
              <p className="m-0 leading-relaxed">
                L&apos;autocomplétion se déclenche à partir de 3 lettres. Vous pouvez enregistrer des gares en favoris
                (stockées localement sur votre navigateur) pour relancer une recherche en un clic.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Lancez la recherche.</strong>
              <p className="m-0 leading-relaxed">
                MaxTracker interroge sa base, alimentée par les données ouvertes SNCF, et affiche les trajets éligibles
                depuis cette gare : segments directs et, le cas échéant, parcours composés avec correspondance. Si la
                gare n&apos;est pas desservie par l&apos;offre TGV Max, un message vous l&apos;indique ; s&apos;il
                n&apos;y a aucun créneau à 0 € pour l&apos;instant, l&apos;app vous invite à réessayer après la prochaine
                mise à jour.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Explorez les destinations.</strong>
              <p className="m-0 leading-relaxed">
                Les résultats sont regroupés par ville d&apos;arrivée et par date. Chaque{" "}
                <strong className="text-slate-800 dark:text-slate-200">trajet direct</strong> affiche date, heure, type de
                train et un lien SNCF Connect. Les{" "}
                <strong className="text-slate-800 dark:text-slate-200">parcours avec correspondance</strong> listent
                chaque segment (gare de correspondance, temps d&apos;attente, hub éventuel) avec un lien de réservation
                par train. Le badge{" "}
                <strong className="text-slate-800 dark:text-slate-200">« Départ possible aujourd&apos;hui »</strong>{" "}
                indique qu&apos;au moins un départ part encore vers cette destination le jour même. Le badge{" "}
                <strong className="text-slate-800 dark:text-slate-200">« Imminent »</strong> signale un départ dans moins
                de 4 heures.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Affinez avec les filtres.</strong>
              <p className="m-0 leading-relaxed">
                Le panneau à gauche (ou la feuille filtres sur mobile) est organisé en{" "}
                <strong className="text-slate-800 dark:text-slate-200">Filtres simples</strong> et{" "}
                <strong className="text-slate-800 dark:text-slate-200">Filtres avancés</strong>, repliables. Le détail
                de chaque option figure dans les tableaux ci-dessous.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Changez de vue selon votre besoin.</strong>
              <p className="m-0 leading-relaxed">
                La vue <strong className="text-slate-800 dark:text-slate-200">Liste</strong> compare les destinations ; le{" "}
                <strong className="text-slate-800 dark:text-slate-200">Calendrier</strong> compte les départs par jour sur
                30 jours (directs et composés) ; le graphique{" "}
                <strong className="text-slate-800 dark:text-slate-200">Pics horaires</strong> met en évidence les heures les
                plus fournies.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Personnalisez l&apos;affichage.</strong>
              <p className="m-0 leading-relaxed">
                L&apos;icône soleil / lune dans le header bascule entre mode clair et mode sombre. La préférence est
                mémorisée dans votre navigateur (<code className="text-xs">mt_theme</code>) ; le changement de thème
                s&apos;accompagne d&apos;une transition en fondu sur toute la page.
              </p>
            </li>
            <li className="pl-1">
              <strong className="block text-slate-800 dark:text-slate-200 mb-1.5">Réservez sur SNCF Connect.</strong>
              <p className="m-0 leading-relaxed">
                MaxTracker ne finalise jamais la vente : chaque train ouvre SNCF Connect pour confirmer que le billet est
                encore disponible et à 0 € selon votre abonnement. Sur un parcours avec correspondance,{" "}
                <strong className="text-slate-800 dark:text-slate-200">chaque segment</strong> possède son propre lien :
                vous devez réserver chaque tronçon éligible séparément.
              </p>
            </li>
          </ol>

          <div
            className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3"
            data-testid="about-connections-info"
          >
            <p className="m-0">
              <strong className="text-slate-800 dark:text-slate-200">Parcours composés.</strong> <br />Chaque ligne open data
              correspond à un segment (une origine, une destination, un train). MaxTracker enchaîne jusqu&apos;à{" "}
              <strong className="text-slate-800 dark:text-slate-200">deux correspondances</strong> via les
              grandes métropoles (Paris, Lyon, Lille, etc.), en respectant des temps de correspondance raisonnables (25 min sur même
              gare, 50 min sur même métropole). <br /> Ce ne sont pas des itinéraires officiels garantis par la SNCF, mais des
              combinaisons calculées à partir des instantanés open data : vérifiez chaque segment sur SNCF Connect.
            </p>
          </div>

          <div data-testid="about-filters-table">
            <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Les filtres
            </h3>
            {ABOUT_FILTER_SECTIONS.map((section) => (
              <FilterTable key={section.title} section={section} />
            ))}
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Le badge <strong className="text-slate-700 dark:text-slate-300">« Départ possible aujourd&apos;hui »</strong>{" "}
              sur une destination reprend la même logique que le filtre homonyme.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="m-0">
              <strong className="text-slate-800 dark:text-slate-200">Fenêtre de 30 jours.</strong> Seuls les départs des
              30 prochains jours sont indexés : c'est la période couverte par l'offre TGV Max et par le jeu de données
              utilisé. Le filtre <em>Horizon de dates</em> restreint cette plage côté interface. Un train affiché ici est{" "}
              <strong className="text-slate-800 dark:text-slate-200">éligible selon l'open data</strong>, pas une garantie
              de place encore libre au moment où vous réservez.
            </p>
          </div>

          <div>
            <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Synchronisation
            </h3>
            <p className="m-0">
              Sur l'écran Recherche, le header affiche deux horodatages : la dernière publication des{" "}
              <strong className="text-slate-800 dark:text-slate-200">données SNCF</strong> et la dernière{" "}
              <strong className="text-slate-800 dark:text-slate-200">importation MaxTracker</strong> (environ toutes les
              15 minutes). Un bouton permet de forcer une sync manuelle. Ce n'est pas du temps réel : un billet peut être
              réservé entre deux rafraîchissements. Pour la source, les licences et les écarts possibles avec SNCF Connect,
              voir{" "}
              <a href="#les-donnees" className="underline hover:text-[#0A2540] dark:hover:text-slate-200">
                Les données
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <section
        id="les-donnees"
        className="mt-10 scroll-mt-24"
        aria-labelledby="about-les-donnees"
        data-testid="about-section-donnees"
      >
        <h2 id="about-les-donnees" className="text-3xl font-bold text-[#0A2540] dark:text-slate-100">
          Les données
        </h2>
        <div className="mt-4 space-y-4">
          <p>
            Les trajets affichés proviennent du jeu de données ouvert{" "}
            <a
              href="https://data.sncf.com/explore/dataset/tgvmax/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#0A2540] dark:hover:text-slate-200"
            >
              « Disponibilités TGV Max »
            </a>
            , publié par <strong className="text-slate-800 dark:text-slate-200">SNCF Voyageurs</strong> sur la plateforme
            Opendatasoft, sous la licence indiquée sur le portail open data.
          </p>
          <p>
            Il s'agit d'un <strong className="text-slate-800 dark:text-slate-200">instantané national</strong> des créneaux
            encore éligibles à la réservation MAX — un segment par ligne, pas d'un stock temps réel train par train. Le
            compteur affiché sur l'écran Recherche (ex. « X trajets éligibles suivis en France ») reflète l'ensemble de la
            base indexée, pas uniquement votre dernière recherche.
          </p>

          <ul className="space-y-3">
            <li className="flex gap-3">
              <span className="shrink-0 font-mono text-xs font-semibold text-[#0A2540] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 h-fit">
                SNCF
              </span>
              <span>
                Publication d'une nouvelle vague de données{" "}
                <strong className="text-slate-800 dark:text-slate-200">chaque jour en début de matinée</strong> (aux
                alentours de 6 h 30). Ce n'est pas une mise à jour minute par minute.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-mono text-xs font-semibold text-[#0A2540] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 h-fit">
                MaxTracker
              </span>
              <span>
                Import de ce flux environ <strong className="text-slate-800 dark:text-slate-200">toutes les 15 minutes</strong>{" "}
                lorsque le service est actif. La « dernière sync » du header correspond à ce dernier import — elle ne peut pas
                être plus récente que la publication SNCF.
              </span>
            </li>
          </ul>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-amber-900 dark:text-amber-200">
            <p className="m-0">
              <strong>Écarts possibles avec SNCF Connect.</strong> L'application officielle s'appuie sur des systèmes privés
              (stock et tarifs en temps réel). MaxTracker n'utilise que le flux public : un train listé ici peut ne plus être
              disponible sur Connect, et inversement.{" "}
              <strong className="text-amber-950 dark:text-amber-100">
                Vérifiez toujours sur SNCF Connect avant tout déplacement.
              </strong>
            </p>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Un billet peut être réservé entre deux synchronisations. Les places se libèrent aussi par vagues côté SNCF — l'absence
            de résultat aujourd'hui ne signifie pas qu'il n'y en aura pas demain.
          </p>
        </div>
      </section>

      <section
        id="avertissement"
        className="mt-10 scroll-mt-24"
        aria-labelledby="about-avertissement"
        data-testid="about-section-avertissement"
      >
        <h2 id="about-avertissement" className="text-3xl font-bold text-[#0A2540] dark:text-slate-100">
          Avertissement
        </h2>
        <div className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden />
            <div className="space-y-3 min-w-0">
              <p className="m-0">
                <strong className="text-slate-800 dark:text-slate-200">Service indépendant et non officiel.</strong> MaxTracker
                n'est pas affilié à la SNCF ni à SNCF Voyageurs. « SNCF », « TGV », « TGV Max », « MAX JEUNE », « MAX ACTIF » et
                « SNCF Connect » sont des marques déposées de leurs propriétaires respectifs.
              </p>
              <p className="m-0">
                MaxTracker est un outil de repérage fondé sur des données ouvertes. Il ne vend pas de billet, ne collecte aucun
                identifiant SNCF Connect, n'effectue aucune transaction et ne garantit ni la disponibilité ni le tarif affiché
                sur les canaux officiels.
              </p>
              <p className="m-0">
                L'utilisation du jeu de données SNCF est soumise aux conditions du{" "}
                <a
                  href="https://data.sncf.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#0A2540] dark:hover:text-slate-200"
                >
                  portail open data
                </a>
                . Les informations présentées sur ce site ne constituent pas un conseil de voyage ni une offre commerciale de
                transport.
              </p>
              <p className="m-0 text-slate-800 dark:text-slate-200 font-medium">
                Vérifiez systématiquement la disponibilité réelle et les conditions de votre abonnement sur SNCF Connect avant
                tout déplacement ou achat.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="mt-10 scroll-mt-24"
        aria-labelledby="about-contact"
        data-testid="about-section-contact"
      >
        <h2 id="about-contact" className="text-3xl font-bold text-[#0A2540] dark:text-slate-100">
          Contact
        </h2>
        <div className="mt-4 space-y-4">
          <p>
            MaxTracker est un projet ouvert. Pour consulter le code source, signaler un bug ou proposer une amélioration :
          </p>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 font-medium text-[#0A2540] dark:text-slate-100 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            data-testid="about-github-link"
          >
            <Github className="h-5 w-5 shrink-0" aria-hidden />
            <span>MaxTracker GitHub</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </a>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Les retours se font via les issues GitHub du dépôt. Il n'y a pas de support commercial ni de lien avec la SNCF pour
            les disponibilités ou les réservations.
          </p>
        </div>
      </section>
    </main>
  );
}
