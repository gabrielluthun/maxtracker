// Clés stables pour React : les réponses `compact` n'envoient plus de champ `id`.

export function tripKey(trip) {
  return (
    trip.id ??
    `${trip.train_no}|${trip.date}|${trip.heure_depart}|${trip.origine}|${trip.destination}`
  );
}

export function journeyKey(journey) {
  return journey.id ?? (journey.legs || []).map(tripKey).join(">>");
}
