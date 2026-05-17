import { ShieldAlert } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="mt-12 bg-slate-100 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 leading-relaxed" data-testid="disclaimer">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Service indépendant et non officiel.</strong> MaxTracker n'est pas affilié à
          la SNCF. « SNCF », « TGV », « TGV Max », « MAX JEUNE », « MAX ACTIF » et « SNCF Connect » sont des marques
          déposées de leurs propriétaires respectifs. Les données affichées proviennent du jeu de données ouvert
          <a href="https://data.sncf.com/explore/dataset/tgvmax/" target="_blank" rel="noopener noreferrer" className="underline mx-1 hover:text-[#0A2540]">« Disponibilités TGV Max »</a>
          publié par SNCF Voyageurs sur la plateforme Opendatasoft, sous la licence indiquée par le portail open data.
          Les flux sont synchronisés par vagues (≈ toutes les heures côté SNCF, toutes les 15 min côté MaxTracker) ; un
          billet affiché ici peut donc avoir été réservé entre deux rafraîchissements. <strong>Vérifiez systématiquement la
          disponibilité réelle sur SNCF Connect avant tout déplacement.</strong> MaxTracker ne vend pas de billet, ne
          collecte aucun identifiant SNCF Connect et ne réalise aucune réservation.
        </div>
      </div>
    </div>
  );
}
