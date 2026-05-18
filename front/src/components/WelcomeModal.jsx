import { useEffect, useId, useState } from "react";
import { Info } from "lucide-react";
import { isWelcomeDismissed, setWelcomeDismissed } from "@/lib/storage";

export default function WelcomeModal() {
  const [open, setOpen] = useState(() => !isWelcomeDismissed());
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onConfirm = () => {
    if (dontShowAgain) setWelcomeDismissed();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="welcome-modal"
    >
      <div className="absolute inset-0 bg-[#0A2540]/60 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0A2540] flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 id={titleId} className="text-xl font-bold text-[#0A2540]">
              À qui s'adresse MaxTracker ?
            </h2>
            <p className="text-sm text-emerald-800 mt-0.5">Information importante avant utilisation</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-800">MaxTracker est pensé pour les titulaires d'un abonnement MAX Jeune ou MAX Senior</strong>{" "}
            (offres TGV Max). <br /> Les billets à 0€ affichés correspondent aux conditions de ces offres.
          </p>
          <p>
            Ce site est un <strong className="text-slate-800">outil d'optimisation de recherche</strong> : il agrège et
            filtre les disponibilités publiées quotidiennement par la SNCF pour repérer plus vite les billets éligibles. <br /> Il{" "}
            <strong className="text-slate-800">ne vend pas de billets</strong>, n'est{" "}
            <strong className="text-slate-800">pas affilié à la SNCF</strong> et sert de complément à{" "}
            <strong className="text-slate-800">SNCF Connect</strong> pour la réservation.
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-600">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0A2540] focus:ring-[#0A2540]/30"
              data-testid="welcome-modal-dont-show"
            />
            Ne plus afficher
          </label>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 px-6 rounded-xl bg-[#0A2540] hover:bg-[#173A5E] text-white font-semibold transition-colors shrink-0"
            data-testid="welcome-modal-confirm"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
