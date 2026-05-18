import { ShieldAlert } from "lucide-react";

export default function Disclaimer() {
  return (
    <div
      className="mt-12 bg-slate-100 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 leading-snug"
      data-testid="disclaimer"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="space-y-2 min-w-0">
          <p className="m-0">
            <strong className="text-slate-800">Service indépendant et non officiel.</strong> MaxTracker n'est pas affilié à
            la SNCF. « SNCF », « TGV », « TGV Max », « MAX JEUNE », « MAX ACTIF » et « SNCF Connect » sont des marques
            déposées de leurs propriétaires respectifs.
          </p>
          <p className="m-0">
            Les données affichées proviennent du jeu de données ouvert{" "}
            <a
              href="https://data.sncf.com/explore/dataset/tgvmax/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#0A2540]"
            >
              « Disponibilités TGV Max »
            </a>
            , publié par SNCF Voyageurs sur la plateforme Opendatasoft, sous la licence indiquée par le portail open data.
          </p>
          <p className="m-0">
            Les flux sont synchronisés par vagues (≈ tous les jours côté SNCF, toutes les 15 min côté MaxTracker). Un
            billet affiché ici peut donc avoir été réservé entre deux rafraîchissements.
          </p>
          <p className="m-0">
            <strong className="text-slate-800">
              Vérifiez systématiquement la disponibilité réelle sur SNCF Connect avant tout déplacement.
            </strong>
          </p>
          <p className="m-0">
            MaxTracker ne vend pas de billet, ne collecte aucun identifiant SNCF Connect et ne réalise aucune réservation.
          </p>
        </div>
      </div>
    </div>
  );
}
