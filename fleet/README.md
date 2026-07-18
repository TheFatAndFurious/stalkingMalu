# Fleet

Monorepo [Nx](https://nx.dev) du système de suivi de flotte IoT : des devices (Raspberry Pi,
agent TypeScript/Effect) publient leur télémétrie en MQTT sur réseau mobile, avec gestion des
déconnexions prolongées.

Les décisions d'architecture sont documentées dans [`../docs/adr/`](../docs/adr).

## Prérequis

Le workspace utilise **bun** exclusivement — il est épinglé via le champ `packageManager`.
N'utilise pas `npm` ou `yarn` : le `package.json` déclare un
[catalog](https://bun.sh/docs/install/catalogs) (`workspaces.catalog`), une fonctionnalité
propre à bun. Les autres package managers ne savent pas résoudre le protocole `catalog:` et
produiront une installation silencieusement incomplète.

```sh
bun install
```

## Lancer les tests

Les tests tournent sous [Vitest](https://vitest.dev), pilotés par Nx via le plugin
`@nx/vitest`. Il n'y a pas de script `test` dans `package.json` : les targets sont inférées
automatiquement depuis les `vitest.config.mts` de chaque projet.

```sh
# Tous les projets — le défaut
bunx nx run-many -t test

# Un seul projet
bunx nx test @fleet/device-contract

# Uniquement ce qui a changé par rapport à master
bunx nx affected -t test
```

### Mode watch

Le `vitest.config.mts` force `watch: false`, donc la target Nx ne watche jamais. Pour du
développement itératif, passe par Vitest directement depuis le dossier du projet :

```sh
cd packages/device-contract
bunx vitest --watch
```

### Cibler des tests précis

Toujours depuis le dossier du projet :

```sh
# Un fichier
bunx vitest run src/messages/telemetry.test.ts

# Les tests dont le nom contient "compat"
bunx vitest run -t compat

# Avec la couverture (sortie dans ./test-output/vitest/coverage)
bunx vitest run --coverage
```

Les options Vitest passent aussi à travers Nx, après `--` :

```sh
bunx nx test @fleet/device-contract -- --coverage --bail 1
```

### À propos de la target `test-ci`

Nx expose aussi une target `test-ci`, qu'il « atomise » en une tâche par fichier de test
(`test-ci--src/messages/telemetry.test.ts`, etc.) afin de distribuer l'exécution sur
plusieurs agents. En local elle n'apporte rien d'autre que de l'overhead — utilise `test`.

## Autres tâches

```sh
bunx nx build @fleet/device-contract       # compilation tsc
bunx nx typecheck @fleet/device-contract   # vérification de types seule
bunx nx lint @fleet/device-contract        # ESLint sur un projet
bunx nx run-many -t build                  # sur tous les projets
```

Lint et formatage à l'échelle du workspace ([oxlint](https://oxc.rs) / oxfmt) :

```sh
bun run lint          # bun run lint:fix pour corriger
bun run format        # bun run format:check en CI
```

Pour visualiser le graphe de dépendances :

```sh
bunx nx graph
```

## Structure

```
fleet/
├── packages/
│   └── device-contract/        # contrat partagé device ↔ backend
└── nx.json                     # plugins et targets inférées
```

Le workspace déclare aussi `apps/*` dans ses globs, mais le dossier n'existe pas encore —
c'est là que vivra l'agent device (`apps/agent-pi` dans l'ADR-001).

`@fleet/device-contract` est la source de vérité du protocole : identifiants brandés,
schémas de payloads (GPS, température), messages, adressage des topics MQTT et politique de
QoS, codecs d'encodage/décodage, et invariants.

## Références de projet TypeScript

Nx maintient automatiquement les [project
references](https://www.typescriptlang.org/docs/handbook/project-references.html) des
`tsconfig.json` à partir du graphe de dépendances. La synchronisation se fait toute seule
lors d'un `build` ou d'un `typecheck`, mais peut être déclenchée manuellement :

```sh
bunx nx sync
```

En CI, `bunx nx sync:check` échoue si les références ne sont pas à jour.

## Liens

- [Nx — exécuter des tâches](https://nx.dev/features/run-tasks)
- [Nx — tâches inférées](https://nx.dev/concepts/inferred-tasks)
- [Effect](https://effect.website)
- [Vitest](https://vitest.dev)
