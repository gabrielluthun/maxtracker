# Document de Contraintes - Projet de Plateforme TGV Max (MaxTracker / TrackMax)

Ce document recense l'ensemble des contraintes techniques, fonctionnelles, architecturales et légales liées à la conception et au développement de la plateforme de recherche alternative pour l'abonnement TGV Max.

---

## 🛰️ 1. Contraintes Techniques (Données & API publique)

* **Asynchronisme des données (Décalage Temporel) :** L'API Open Data de la SNCF ne fournit pas de flux en temps réel. Elle fonctionne par "snapshots" (instantanés) mis à jour par vagues, environ toutes les heures. Il existe donc un risque inhérent de faux positifs (un billet affiché à 0€ sur la plateforme peut avoir été vendu sur SNCF Connect entre deux rafraîchissements).
* **Limitation des requêtes (Rate Limiting) :** Bien que la plateforme Opendatasoft soit dimensionnée pour le public, l'authentification impose des quotas d'appels journaliers et par minute qu'il convient de respecter pour éviter le bannissement de l'IP du serveur ou du script de collecte.
* **Volumétrie des flux :** Le jeu de données global des disponibilités TGV Max pour toute la France représente un volume de lignes conséquent. Le système de collecte doit être capable de filtrer efficacement cette masse de données pour ne pas saturer la mémoire du client ou de l'environnement d'exécution.

---

## 🎯 2. Contraintes Fonctionnelles (Règles Métier TGV Max)

* **Période de réservation (Fenêtre glissante) :** L'abonnement TGV Max restreint contractuellement les réservations à une fenêtre maximale de 30 jours à l'avance. Toute donnée supérieure à J+30 présente dans l'API publique est obsolète pour l'utilisateur et doit être impérativement ignorée.
* **Plafond tarifaire strict :** La plateforme se limitant à l'affichage des opportunités d'abonnements, seuls les trajets dont le coût pour l'abonné est strictement égal à 0€ doivent être traités. Les tarifs réduits ou autres gammes de prix doivent être exclus.
* **Absence de tunnel de vente :** La plateforme n'est pas agréée comme agence de voyage ou distributeur officiel. Elle ne peut en aucun cas encaisser d'argent, collecter d'identifiants de connexion SNCF Connect, ni réserver directement la place. Son rôle s'arrête à **l'aiguillage utilisateur** et **simplifier** la vérification des disponibilités.

---

## ⚖️ 3. Contraintes Légales & Propriété Intellectuelle

* **Propriété des marques :** Les termes "SNCF", "TGV Max", "MAX JEUNE", "MAX ACTIF" et "SNCF Connect" sont des marques déposées. La plateforme doit clairement stipuler son caractère indépendant et non officiel pour éviter toute action pour parasitisme ou confusion de marque.
* **Mentions obligatoires et transparence :** L'application doit afficher explicitement un avertissement (Disclaimer) informant l'utilisateur du décalage potentiel des données et de l'obligation de vérifier la disponibilité réelle sur les canaux officiels de la SNCF.
* **Respect des CGU Open Data :** L'utilisation du jeu de données "Disponibilités TGV Max" impose de citer la source des données (SNCF Réseau / Opendatasoft) et de respecter la licence de partage spécifiée par le portail open data.