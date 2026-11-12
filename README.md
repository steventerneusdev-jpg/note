# NOTE.

Un carnet de notes local-first, calme et glassmorphique, construit avec Next.js.

## Démo

[https://note-ten-sooty.vercel.app](https://note-ten-sooty.vercel.app)

## Fonctionnalités

- Éditeur riche : gras, italique, souligné, barré, surlignage, liens, citations et listes imbriquées jusqu'à 15 niveaux.
- Sauvegarde automatique dans le navigateur, à chaque modification.
- Répertoire avec recherche, notes épinglées et suppression avec annulation.
- Collections pour ranger les notes, avec filtres, renommage et suppression.
- Tags sur les notes, affichés dans le répertoire et utilisables comme filtres.
- Thème clair / sombre et interface responsive.

## Stack

- [Next.js 16](https://nextjs.org/) avec App Router et Turbopack
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Lucide](https://lucide.dev/) pour les icônes

## Développement

```bash
npm install
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

## Données

NOTE. ne dépend d'aucun serveur : les notes, collections et tags sont stockés dans le `localStorage` du navigateur, sous les clés `lumen.notes.v1` et `lumen.collections.v1`. Les données restent donc sur l'appareil et dans le profil du navigateur utilisé.

## Vérifications

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Déploiement

Le projet est prêt pour un déploiement Vercel. Aucune variable d'environnement n'est nécessaire pour cette version.
