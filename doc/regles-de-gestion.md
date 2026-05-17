# Référentiel des Règles de Gestion (RG) - Projet MaxTracker

## 💻 1. Interface Utilisateur & Affichage (Frontend)

**RG11**: L'interface utilisateur **doit** filtrer les résultats uniquement selon la gare de départ sélectionnée par l'utilisateur  
**RG12**: L'interface utilisateur **doit** regrouper les trains disponibles par ville de destination  
**RG13**: L'interface utilisateur **doit** trier les trajets par ordre chronologique de départ  
**RG14**: L'interface utilisateur **doit** afficher de manière visible l'heure exacte de la dernière synchronisation des données  
**RG15**: L'interface utilisateur **doit** fournir pour chaque train affiché un lien de redirection direct vers SNCF Connect  
**RG19**: L'interface utilisateur **doit** proposer une autocomplétion des gares dès la saisie d'au moins 3 caractères  
**RG17**: L'interface utilisateur **doit** permettre à l'utilisateur de mettre en favoris ses gares de départ les plus fréquentes  
**RG18**: L'interface utilisateur **doit** intégrer un filtre rapide pour afficher uniquement les départs du week-end  
**RG19**: L'interface utilisateur **doit** permettre de filtrer les résultats par créneaux horaires de départ  
**RG20**: L'interface utilisateur **doit** permettre de masquer les trajets contenant des correspondances  
**RG21**: L'interface utilisateur **doit** distinguer graphiquement les trains de type TGV INOUI et INTERCITÉS  
**RG22**: L'interface utilisateur **doit** afficher un message d'erreur si la gare saisie n'est pas desservie par l'offre TGV Max  
**RG23**: L'interface utilisateur **doit** afficher un écran spécifique "Aucun train disponible" si aucun billet à 0€ n'est trouvé  
**RG24**: L'interface utilisateur **doit** mémoriser localement la dernière recherche de l'utilisateur pour la recharger automatiquement  
**RG25**: L'interface utilisateur **doit** permettre à l'utilisateur de masquer définitivement certaines destinations de son écran  
**RG26**: L'interface utilisateur **doit** proposer une vue "Calendrier" affichant le nombre total de trains à 0€ disponibles par jour  
**RG27**: L'interface utilisateur **doit** appliquer un badge visuel "Départ imminent" si le départ a lieu dans moins de 4 heures  
**RG28**: L'interface utilisateur **doit** permettre de filtrer spécifiquement les gares d'arrivée au sein d'une même ville  
**RG29**: L'interface utilisateur **doit** afficher un graphique représentant les heures de la journée à forte probabilité de trains à 0€  
**RG30**: L'interface utilisateur **doit** utiliser le chargement progressif pour afficher les destinations par vagues de 10 résultats  

---

## 🔍 2. Logique de Recherche & Traitement (Moteur)

**RG8**: Le système ne **doit** **PAS** lancer de recherche si l'utilisateur n'a sélectionné aucune gare valide  
**RG9**: Le système **doit** permettre de regrouper les gares d'une même grande métropole sous une seule entité  
**RG10**: Le système **doit** proposer une fonction permettant d'inverser instantanément les gares pour trouver un trajet retour  

---

## 🔄 3. Collecte & Gestion des données (Backend)

**RG1**: Le système **doit** synchroniser les données de l'API Open Data SNCF toutes les 15 minutes
**RG2**: Le système **doit** conserver uniquement les trajets ayant l'éligibilité TGV Max active  
**RG3**: Le système ne **doit** **PAS** intégrer les trajets dont la date de départ dépasse les 30 jours glissants  
**RG4**: Le système **doit** supprimer automatiquement de la base locale les trains dont l'heure de départ est passée  
**RG5**: Le système **doit** rejeter les doublons de trajets basés sur le numéro de train, la date et les gares  
**RG6**: Le système **doit** basculer sur l'affichage des données du cache si l'API Open Data SNCF est indisponible  
**RG7**: Le système **doit** limiter le nombre de recherches à 10 par minute et par utilisateur pour éviter les surcharges  
