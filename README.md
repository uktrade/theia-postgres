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

Theia must be started with an environment variable `DATABASE_DSN__datasets_1` containing connection details in the format `host=myhost.com port=1234 ssl=require database=mydatabase user=myuser password=mypassword`. Each component is required.
