# theia-postgresql

Theia plugin for exploring a PostgreSQL database, allow queries to be entered, run, and results saved. Forked from [Borvik's vscode-postgres](https://github.com/Borvik/vscode-postgres).


## Building

```bash
yarn install
yarn run build
```


## Installation

The build step creates a file `theia-postgres.theia`. This should be copied into the Theia plugins directory.


## Usage

Theia must be started with [libpq environment variables](https://www.postgresql.org/docs/current/libpq-envars.html) containing credentials for the database. However, the SSL configuration has stricter defaults than libpq, so to disable SSL you must set `PGSSLMODE=disable`. For example:

```
PGHOST=localhost \
PGPORT=5432 \
PGSSLMODE=disable \
PGDATABASE=postgres \
PGUSER=postgres \
PGPASSWORD=password \
    yarn theia start
```
