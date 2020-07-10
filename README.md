# theia-postgresql

Theia plugin for exploring a PostgreSQL database, allow queries to be entered, run, with results saved.


## Usage

Theia must be started with an environment variable `DATABASE_DSN__datasets_1` containing connection details in the format `host=hostname.com port=1234 ssl=require database=databasename user=myuser password=mypassword`. Each component is required.


## Building

```bash
yarn install
yarn run build
```


## Developing

The above 