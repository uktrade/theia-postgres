# theia-postgresql

Theia plugin for exploring a PostgreSQL database, allow queries to be entered, run, and results saved.


## Building

```bash
yarn install
yarn run build
```


## Installation

The build step creates a file `theia-postgres.theia`. This should be copied into the Theia plugins directory.


## Usage

Theia must be started with [libpq environment variables](https://www.postgresql.org/docs/current/libpq-envars.html) containing credentials for the database. For example:

```
PGHOST=localhost \
PGPORT=5432 \
PGDATABASE=postgres \
PGUSER=postgres \
PGPASSWORD=password \
    yarn theia start
```
