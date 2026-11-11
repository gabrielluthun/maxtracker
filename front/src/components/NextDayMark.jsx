/** « +1 j » à côté d'une heure d'arrivée le lendemain (trains de nuit). */
export default function NextDayMark({ offset }) {
  if (!offset) return null;
  const label = offset === 1 ? "Arrivée le lendemain" : `Arrivée ${offset} jours plus tard`;
  return (
    <sup
      className="ml-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300"
      title={label}
      aria-label={label}
      data-testid="next-day-mark"
    >
      +{offset} j
    </sup>
  );
}
