import AppHeader from "@/components/AppHeader";
import { APP_VIEW } from "@/lib/appView";

export default function About() {
  return (
    <div className="min-h-screen hero-radial" data-testid="about-page">
      <AppHeader activeView={APP_VIEW.ABOUT} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight">
          À propos
        </h1>

        <section
          id="le-projet"
          className="mt-10 scroll-mt-24"
          aria-labelledby="about-le-projet"
          data-testid="about-section-projet"
        >
          <h2 id="about-le-projet" className="text-xl font-bold text-[#0A2540]">
            Le projet
          </h2>
          <div className="mt-4 space-y-4 text-slate-600 leading-relaxed">
            <p>
              <strong className="text-slate-800">MaxTracker</strong> aide les titulaires d'un abonnement{" "}
              <strong className="text-slate-800">MAX Jeune ou MAX Senior</strong> (offres TGV Max) à repérer plus
              vite les trajets éligibles à <strong className="text-slate-800">0 €</strong> sur les{" "}
              <strong className="text-slate-800">30 prochains jours</strong>, depuis la gare de leur choix.
            </p>
            <p>
              L'outil agrège et filtre les disponibilités publiées dans les données ouvertes SNCF — sans parcourir
              destination par destination sur{" "}
              <a
                href="https://www.sncf-connect.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#0A2540]"
              >
                SNCF Connect
              </a>
              . C'est un complément de recherche, pas un canal de vente.
            </p>
            <p>
              MaxTracker est <strong className="text-slate-800">gratuit</strong>,{" "}
              <strong className="text-slate-800">indépendant et non affilié à la SNCF</strong>. Il ne vend pas de
              billets, ne collecte aucun identifiant SNCF Connect et ne réalise aucune réservation.
            </p>
          </div>
        </section>

        <section
          id="comment-ca-marche"
          className="mt-10 scroll-mt-24"
          aria-labelledby="about-comment-ca-marche"
          data-testid="about-section-comment-ca-marche"
        >
          <h2 id="about-comment-ca-marche" className="text-xl font-bold text-[#0A2540]">
            Comment ça marche
          </h2>
          <div className="mt-4 space-y-6 text-slate-600 leading-relaxed">
            <p>
              MaxTracker part d'une seule question : <em>« Quels trajets TGV Max à 0 € puis-je prendre depuis ma gare
              dans le mois qui vient ? »</em> Voici le parcours, de la saisie de la gare jusqu'à la réservation sur le
              canal officiel.
            </p>

            <ol className="space-y-4 list-decimal list-outside ml-5 marker:font-semibold marker:text-[#0A2540]">
              <li className="pl-1">
                <strong className="text-slate-800">Choisissez votre gare de départ.</strong> L'autocomplétion se
                déclenche à partir de 3 lettres. Vous pouvez enregistrer des gares en favoris (stockées localement sur
                votre navigateur) pour relancer une recherche en un clic.
              </li>
              <li className="pl-1">
                <strong className="text-slate-800">Lancez la recherche.</strong> MaxTracker interroge sa base, alimentée
                par les données ouvertes SNCF, et affiche tous les trajets éligibles trouvés depuis cette gare. Si la
                gare n'est pas desservie par l'offre TGV Max, un message vous l'indique ; s'il n'y a aucun créneau à 0 €
                pour l'instant, l'app vous invite à réessayer après la prochaine mise à jour.
              </li>
              <li className="pl-1">
                <strong className="text-slate-800">Explorez les destinations.</strong> Les trains sont regroupés par
                ville d'arrivée. Chaque carte indique la date, l'heure, le type de train (TGV INOUI, Intercités,
                Intercités de nuit) et un lien vers SNCF Connect. Le badge{" "}
                <strong className="text-slate-800">« Imminent »</strong> signale un départ dans moins de 4 heures.
              </li>
              <li className="pl-1">
                <strong className="text-slate-800">Affinez avec les filtres.</strong> Ciblez les week-ends uniquement,
                un créneau (matin, après-midi, soir), un type de train, ou les trajets sans correspondance. Vous pouvez
                aussi masquer une destination pour ne plus la voir dans vos résultats (réversible depuis le panneau
                filtres).
              </li>
              <li className="pl-1">
                <strong className="text-slate-800">Changez de vue selon votre besoin.</strong> La vue{" "}
                <strong className="text-slate-800">Liste</strong> compare les destinations ; le{" "}
                <strong className="text-slate-800">Calendrier</strong> montre combien de trains partent chaque jour sur
                30 jours ; le graphique <strong className="text-slate-800">Pics horaires</strong> met en évidence les
                heures les plus fournies.
              </li>
              <li className="pl-1">
                <strong className="text-slate-800">Réservez sur SNCF Connect.</strong> MaxTracker ne finalise jamais la
                vente : chaque trajet ouvre SNCF Connect pour confirmer que le billet est encore disponible et à 0 €
                selon votre abonnement, puis effectuer la réservation.
              </li>
            </ol>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
              <p className="m-0">
                <strong className="text-slate-800">Fenêtre de 30 jours.</strong> Seuls les départs des 30 prochains
                jours sont indexés — c'est la période couverte par l'offre TGV Max et par le jeu de données utilisé.
                Un train affiché ici est <strong className="text-slate-800">éligible selon l'open data</strong>, pas une
                garantie de place encore libre au moment où vous réservez.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Synchronisation
              </h3>
              <p className="m-0">
                Sur l'écran Recherche, le header affiche deux horodatages : la dernière publication des{" "}
                <strong className="text-slate-800">données SNCF</strong> et la dernière{" "}
                <strong className="text-slate-800">importation MaxTracker</strong> (environ toutes les 15 minutes). Un
                bouton permet de forcer une sync manuelle. Ce n'est pas du temps réel : un billet peut être réservé entre
                deux rafraîchissements. Pour la source, les licences et les écarts possibles avec SNCF Connect, voir{" "}
                <a href="#les-donnees" className="underline hover:text-[#0A2540]">
                  Les données
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
