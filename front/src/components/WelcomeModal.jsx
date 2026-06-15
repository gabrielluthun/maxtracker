import { useEffect, useId, useState } from "react";
import { Info } from "lucide-react";
import { isWelcomeDismissed, setWelcomeDismissed } from "@/lib/storage";

const EMPHASIS = "text-slate-800 dark:text-slate-200";
const LINK = "underline text-emerald-800 dark:text-emerald-300/90 hover:text-[#0A2540] dark:hover:text-slate-100";

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
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/80 dark:bg-emerald-950/30 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0A2540] dark:bg-slate-700 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 id={titleId} className="text-xl font-bold text-[#0A2540] dark:text-slate-100">
              À qui s&apos;adresse MaxTracker ?
            </h2>
            <p className="text-sm text-emerald-800 dark:text-emerald-300/90 mt-0.5">
              Information importante avant utilisation
            </p>
          </div>
        </div>

        <div className="px-6 py-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-3">
          <p className="m-0">
            Ce site s&apos;adresse <strong className={EMPHASIS}>uniquement</strong> aux <strong className={EMPHASIS}>titulaires</strong> d&apos;un abonnement{" "}
            <strong className={EMPHASIS}>« MAX Jeune »</strong> (16–27 ans) ou{" "}
            <strong className={EMPHASIS}>MAX Senior</strong> (60 ans et +) de la SNCF.
          </p>
          <p className="m-0">
            Les trajets indiqués à <strong className={EMPHASIS}>0&nbsp;€</strong> supposent qu'un abonnement MAX est
            <strong className={EMPHASIS}> actif</strong> sur SNCF Connect.
          </p>
          <p className="m-0">
            MaxTracker est un <strong className={EMPHASIS}>outil de repérage</strong> utilisant les données ouvertes de la SNCF. <br/><strong className={EMPHASIS}>Une redirection vers SNCF Connect est automatique</strong> lors d'une réservation.
          </p>
          <p className="m-0">
            Ce service est <strong className={EMPHASIS}>gratuit</strong>, <strong className={EMPHASIS}>indépendant</strong> et <strong className={EMPHASIS}>non affilié à la SNCF</strong>. <br />
            Vérifiez la disponibilité réelle sur <strong className={EMPHASIS}>SNCF Connect</strong> avant toute réservation.
          </p>

          <p className="m-0">
            Pour en savoir plus, consultez la page <a href="#about" className={LINK}>à propos</a>.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#0A2540] focus:ring-[#0A2540]/30 dark:bg-slate-800"
              data-testid="welcome-modal-dont-show"
            />
            Ne plus afficher
          </label>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 w-full sm:w-auto px-8 rounded-xl bg-[#0A2540] hover:bg-[#173A5E] text-white font-semibold tracking-wide shadow-md shadow-black/15 dark:shadow-black/40 transition-colors"
            data-testid="welcome-modal-confirm"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  );
}