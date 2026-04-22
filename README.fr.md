# Trouveur de représentants canadiens

**Trouvez votre député fédéral, votre député provincial/territorial et vos conseillers municipaux à partir de votre code postal.**

Propulsé par l'[API Represent](https://represent.opennorth.ca) — gratuit, aucune clé API requise.

---

🇬🇧 *The full English version is available in [README.md](README.md).*

---

## Fonctionnalités

- Recherche de tous les représentants élus pour n'importe quel code postal canadien
- Couvre les **3 paliers de gouvernement** : fédéral, provincial/territorial et municipal
- Données en direct via l'API Represent — toujours à jour
- Cache local de 24 heures pour minimiser les requêtes API
- Sortie JSON pour l'intégration avec d'autres outils
- Affichage bilingue (anglais / français)

## Prérequis

- Python 3.10+
- Connexion Internet (pour les données en direct)

## Installation

```bash
git clone https://github.com/votrenomdutilisateur/canadian-representatives-finder.git
cd canadian-representatives-finder
pip install -r requirements.txt
```

Ou installez comme outil en ligne de commande :

```bash
pip install -e .
```

## Démarrage rapide

```bash
# Par code postal (avec ou sans espace)
python -m src.main H2X1Y6
python -m src.main "H2X 1Y6"

# Invite interactive (sans argument)
python -m src.main

# Après pip install -e .
canrep H2X1Y6
```

## Exemple de sortie

```
============================================================
Représentants pour le code postal H2X 1Y6
============================================================

--- FÉDÉRAL ---

  MP: Steven Guilbeault
  Party / Parti: Liberal
  District: Laurier—Sainte-Marie
  Phone / Tél.: 514-522-1339
  Email: steven.guilbeault@parl.gc.ca

--- PROVINCIAL ---

  MNA: Andrés Fontecilla
  Party / Parti: Québec solidaire
  District: Laurier-Dorion
  Phone / Tél.: 514-948-2095
  Email: afontecilla-laurdor@assnat.qc.ca

--- MUNICIPAL ---

  Mayor: Valérie Plante
  Party / Parti: Projet Montréal
  District: Montréal
  Phone / Tél.: 514-872-3101
  Email: valerie.plante@montreal.ca

============================================================
Données fournies par l'API Represent (represent.opennorth.ca)
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Sortie au format JSON |
| `--level federal\|provincial\|municipal` | Filtrer par palier de gouvernement |
| `--lang en\|fr` | Langue d'affichage (défaut : `en`) |
| `--no-cache` | Ignorer le cache local et récupérer des données fraîches |

### Exemples

```bash
# Sortie JSON
python -m src.main K1A0A6 --json

# Représentants fédéraux seulement
python -m src.main H2X1Y6 --level federal

# Étiquettes en français
python -m src.main H2X1Y6 --lang fr

# Forcer une récupération fraîche
python -m src.main H2X1Y6 --no-cache
```

## Exécuter les tests

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=term-missing
```

## Structure du projet

```
canadian-representatives-finder/
├── src/
│   ├── models.py       Dataclasses Representative et Office
│   ├── validators.py   Validation et normalisation des codes postaux
│   ├── api_client.py   Wrapper de l'API Represent avec cache
│   ├── formatters.py   Formatage de la sortie (texte et JSON)
│   └── main.py         Point d'entrée CLI
├── tests/
│   ├── test_validators.py
│   ├── test_formatters.py
│   └── test_api_client.py
├── data/
│   ├── cache/          Réponses API en direct (ignorées par git, TTL 24h)
│   └── examples/
│       └── quebec_sample.json   Données de démonstration pour H2X 1Y6 (Montréal)
└── docs/
    └── API_REFERENCE.md
```

## Source des données et attribution

Ce projet utilise l'**[API Represent](https://represent.opennorth.ca)** d'
[OpenNorth](https://opennorth.ca), un organisme canadien à but non lucratif.
L'API est gratuite et ouverte, sans authentification requise.

- Couverture : 338 députés fédéraux, tous les législateurs provinciaux/territoriaux, 7 000+ élus municipaux
- Limite de débit : 60 requêtes/minute
- Les données sont mises à jour après chaque élection

Veuillez consulter les [conditions d'utilisation d'OpenNorth](https://represent.opennorth.ca/api/)
avant de déployer cet outil publiquement.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT — voir [LICENSE](LICENSE).
