# À ta portée — apprendre le solfège au piano

Un site pour apprendre à lire la musique en jouant : branche ton piano MIDI, lis la note, joue-la, et le site t'écoute et te corrige en direct.

## Ce qu'il contient

- **Cours de solfège** : 16 leçons, du repérage du Do jusqu'aux accords et aux nuances, avec des exercices à jouer.
- **Séance du jour** : une séance guidée qui enchaîne lecture de notes, rythme, déchiffrage et morceau.
- **Entraînements à niveau adaptatif** : lecture de notes (16 paliers), déchiffrage (14 niveaux), rythme (12 niveaux), oreille (notes, intervalles, accords, dictée). Le niveau monte ou descend selon tes résultats, et chaque module a son suivi.
- **Gammes et accords** dans toutes les tonalités, avec doigtés.
- **Morceaux** à travailler main par main, à son rythme ou au métronome, et **import de partitions** MusicXML ou MIDI (par exemple exportées depuis MuseScore).

## Utilisation

- Navigateur conseillé : **Chrome** ou **Edge** sur ordinateur (le MIDI n'est pas disponible dans Safari).
- Relie ton piano en USB, puis clique sur « Connecter mon piano ».
- Sans piano, le clavier à l'écran et les touches de l'ordinateur fonctionnent aussi.
- Une connexion internet est nécessaire pour afficher les partitions.

## Données

Aucun compte, aucun envoi : la progression, les réglages et les partitions importées restent dans le navigateur de chaque visiteur.

## Lancer le site en local

Le site est fait de fichiers statiques. Depuis ce dossier :

```bash
python -m http.server 8765
```

puis ouvre `http://localhost:8765/`. Sous Windows, `Lancer.bat` fait la même chose.

## Crédits

- Affichage des partitions : [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/) (licence BSD-3-Clause), chargé depuis jsDelivr.
- Les morceaux intégrés sont traditionnels ou du domaine public, dans des arrangements simplifiés écrits pour ce site.
