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
      </main>
    </div>
  );
}
