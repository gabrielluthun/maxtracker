"""IP du client derrière des proxys (Vercel, nginx…) pour la limite de requêtes.

Derrière la réécriture Vercel, l'IP vue par le serveur est celle de Vercel :
sans configuration, tous les utilisateurs d'un même nœud Vercel partagent le
même quota. Chaque proxy de confiance ajoute une entrée à droite de
`X-Forwarded-For` ; avec `trusted_hops = N`, l'IP du client est la N-ième en
partant de la droite.

Limite : si le backend est aussi joignable sans passer par Vercel, un client
peut forger cet en-tête et contourner la limite. Elle reste une protection
de confort contre les calculs à froid en rafale, pas un contrôle d'accès.
"""
import ipaddress
import logging

from starlette.requests import Request

logger = logging.getLogger("maxtracker")

_diagnostic_logged = False


def _peer_kind(host: str) -> str:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return "inconnue"
    if ip.is_loopback:
        return "locale (loopback)"
    if ip.is_private:
        return "privée"
    return "publique"


def _log_diagnostic_once(peer: str, chain: list[str], trusted_hops: int) -> None:
    """Forme de la chaîne de proxys (sans aucune IP) pour régler TRUSTED_PROXY_HOPS."""
    global _diagnostic_logged
    if _diagnostic_logged:
        return
    _diagnostic_logged = True
    logger.info(
        "client IP: TRUSTED_PROXY_HOPS=%d, connexion %s, X-Forwarded-For à %d entrée(s) "
        "(Vercel → uvicorn : 1 ; Vercel → nginx → uvicorn : 2)",
        trusted_hops,
        _peer_kind(peer),
        len(chain),
    )


def client_ip(request: Request, *, trusted_hops: int = 0) -> str:
    peer = request.client.host if request.client else "anon"
    chain = [
        part.strip()
        for part in request.headers.get("x-forwarded-for", "").split(",")
        if part.strip()
    ]
    _log_diagnostic_once(peer, chain, trusted_hops)
    if trusted_hops <= 0 or not chain:
        return peer
    if len(chain) >= trusted_hops:
        return chain[-trusted_hops]
    # Moins d'entrées que de proxys attendus : la plus à gauche a été ajoutée
    # par le premier proxy de confiance traversé.
    return chain[0]


def reset_diagnostic() -> None:
    """Tests."""
    global _diagnostic_logged
    _diagnostic_logged = False
