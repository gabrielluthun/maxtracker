import { ShieldAlert } from "lucide-react";
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

        <section
          id="les-donnees"
          className="mt-10 scroll-mt-24"
          aria-labelledby="about-les-donnees"
          data-testid="about-section-donnees"
        >
          <h2 id="about-les-donnees" className="text-xl font-bold text-[#0A2540]">
            Les données
          </h2>
          <div className="mt-4 space-y-4 text-slate-600 leading-relaxed">
            <p>
              Les trajets affichés proviennent du jeu de données ouvert{" "}
              <a
                href="https://data.sncf.com/explore/dataset/tgvmax/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#0A2540]"
              >
                « Disponibilités TGV Max »
              </a>
              , publié par <strong className="text-slate-800">SNCF Voyageurs</strong> sur la plateforme Opendatasoft,
              sous la licence indiquée sur le portail open data.
            </p>
            <p>
              Il s'agit d'un <strong className="text-slate-800">instantané national</strong> des créneaux encore
              éligibles à la réservation MAX — pas d'un stock temps réel train par train. Le compteur affiché sur l'écran
              Recherche (ex. « X trajets éligibles suivis en France ») reflète l'ensemble de la base indexée, pas
              uniquement votre dernière recherche.
            </p>

            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="shrink-0 font-mono text-xs font-semibold text-[#0A2540] bg-slate-100 border border-slate-200 rounded px-2 py-1 h-fit">
                  SNCF
                </span>
                <span>
                  Publication d'une nouvelle vague de données{" "}
                  <strong className="text-slate-800">chaque jour en début de matinée</strong> (aux alentours de 6 h 30).
                  Ce n'est pas une mise à jour minute par minute.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-mono text-xs font-semibold text-[#0A2540] bg-slate-100 border border-slate-200 rounded px-2 py-1 h-fit">
                  MaxTracker
                </span>
                <span>
                  Import de ce flux environ <strong className="text-slate-800">toutes les 15 minutes</strong> lorsque le
                  service est actif. La « dernière sync » du header correspond à ce dernier import — elle ne peut pas être
                  plus récente que la publication SNCF.
                </span>
              </li>
            </ul>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              <p className="m-0">
                <strong>Écarts possibles avec SNCF Connect.</strong> L'application officielle s'appuie sur des systèmes
                privés (stock et tarifs en temps réel). MaxTracker n'utilise que le flux public : un train listé ici peut
                ne plus être disponible sur Connect, et inversement.{" "}
                <strong className="text-amber-950">
                  Vérifiez toujours sur SNCF Connect avant tout déplacement.
                </strong>
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Un billet peut être réservé entre deux synchronisations. Les places se libèrent aussi par vagues côté SNCF
              — l'absence de résultat aujourd'hui ne signifie pas qu'il n'y en aura pas demain.
            </p>
          </div>
        </section>

        <section
          id="avertissement"
          className="mt-10 scroll-mt-24"
          aria-labelledby="about-avertissement"
          data-testid="about-section-avertissement"
        >
          <h2 id="about-avertissement" className="text-xl font-bold text-[#0A2540]">
            Avertissement
          </h2>
          <div className="mt-4 rounded-2xl bg-slate-100 border border-slate-200 p-5 text-sm text-slate-600 leading-relaxed">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" aria-hidden />
              <div className="space-y-3 min-w-0">
                <p className="m-0">
                  <strong className="text-slate-800">Service indépendant et non officiel.</strong> MaxTracker n'est pas
                  affilié à la SNCF ni à SNCF Voyageurs. « SNCF », « TGV », « TGV Max », « MAX JEUNE », « MAX ACTIF » et
                  « SNCF Connect » sont des marques déposées de leurs propriétaires respectifs.
                </p>
                <p className="m-0">
                  MaxTracker est un outil de repérage fondé sur des données ouvertes. Il ne vend pas de billet, ne
                  collecte aucun identifiant SNCF Connect, n'effectue aucune transaction et ne garantit ni la
                  disponibilité ni le tarif affiché sur les canaux officiels.
                </p>
                <p className="m-0">
                  L'utilisation du jeu de données SNCF est soumise aux conditions du{" "}
                  <a
                    href="https://data.sncf.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[#0A2540]"
                  >
                    portail open data
                  </a>
                  . Les informations présentées sur ce site ne constituent pas un conseil de voyage ni une offre
                  commerciale de transport.
                </p>
                <p className="m-0 text-slate-800 font-medium">
                  Vérifiez systématiquement la disponibilité réelle et les conditions de votre abonnement sur SNCF
                  Connect avant tout déplacement ou achat.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
