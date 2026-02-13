# iFlact Backend
## Overview
This app is a NodeJS server based on [NestJS](https://nestjs.com/).

This app uses Yarn as a package Manager [![Yarn](https://raw.githubusercontent.com/marioterron/logo-images/master/logos/yarn.png)](https://yarnpkg.com).

[Config module](https://www.npmjs.com/package/config) is used for configuration.
Configurations are stored in configuration files on the `config` folder, and can be overridden and extended by environment variables, command line parameters, or external sources.

### Project structure
```bash
monorepo
    packages
        connectors
        constants
        dtos
        entities
        exceptions
        helpers
        interfaces
    apps
        api
        ...
```

### Install dependencies
At first you should have yarn. To install using brew:

```bash
brew install yarn
```

Then install dependencies

```bash
yarn install
```

### Configure environment variables
See `Configuration Environment Variables` parts.

### Build

To build all packages:

```bash
yarn build:all
```

### Clean

Clean all packages:

```bash
yarn prebuild
```

### Test

Run tests:

```bash
yarn test:e2e
```

# Api service

Api Service for front end.
Service uses Postgresql for store data, and rabbitmq for communication between services.

## Configuration Environment Variables

| Name                     | Description                                                    | Example                                 |
|--------------------------|----------------------------------------------------------------|-----------------------------------------|
| SENTRY_ENABLED           | Sentry enable/disable flag                                     | `false`                                 |
| SENTRY_DSN               | The Dsn used to connect to Sentry and identify the project     | `https://sentry`                        |
| NODE_ENV                 | Type of instance configuration. production or development      | `development`                           |
| NODE_APP_INSTANCE        | Type of instance configuration. develop, master or prod        | `develop`                               |
| LOGGER_LEVEL             | Displayed logs level                                           | `info`                                  |
| API_PORT                 | Port for stating api service                                   | `3000`                                  |
| APP_TIME_ZONE            | App Timezone for moment                                        | `Asia/Singapore`                        |
| CLIENT_NAME              | Client alliance name                                           | `apple`                                 |
| ADMIN_PHRASE             | Private phrase for admin actions                               | `Altair_89`                             |
| FRONTEND_URL             | Frontend service url                                           | `localhost:8080`                        |
| AMQP_HOST                | Connection url to RabbitMQ                                     | `amqp://login:password@rabbitmq:5672`   |
| POSTGRES_HOST            | Postgres host                                                  | `postgres`                              |
| POSTGRES_PORT            | Postgres port                                                  | `5432`                                  |
| POSTGRES_USERNAME        | User name for postgres                                         | `postgres`                              |
| POSTGRES_PASSWORD        | User password for postgres                                     | `root`                                  |
| POSTGRES_DATABASE        | Database name for store data                                   | `test-db`                               |
| POSTGRES_RETRY_ATTEMPTS  | Number of retry connection attempts                            | `15`                                    |
| POSTGRES_RETRY_DELAY     | Delay between connection attempts                              | `10000`                                 |
| URL_SHORTENER_HOST       | Url shortener host for connect via api                         | `http://url-shortener:3002`             |
| SMS_SERVICE_RMQ_QUEUE    | RabbitmqMQ queue name for sms messages                         | `sms_queue`                             |
| JWT_ALGORITHM            | Algorithm for jwt encryption/decryption                        | `RS256`                                 |
| JWT_EXPIRATION           | Token string expiration. Eg: 60, “2 days”, “10h”, “7d”         | `30d`                                   |
| RSA_PRIVATE_KEY_PATH     | Path to file with privateKey                                   | `app/keys/privateKey.pem`               |
| RSA_PUBLIC_KEY_PATH      | Path to file with publicKey                                    | `app/keys/publicKey.pem`                |

## Generate auth ecdsa keys

```bash
openssl ecparam -name secp256k1 -genkey -out privateKey.pem
openssl ec -in privateKey.pem -pubout -out publicKey.pem
```

And set paths: `RSA_PRIVATE_KEY_PATH` and `RSA_PUBLIC_KEY_PATH`

## Run Api service

```bash
yarn start:api
```

## Development

```bash
# start 3rd party services by docker compose
docker-compose -f docker-compose.dev.yml up -d
```

Install dependencies and run development mode

```bash
yarn install
yarn start:api
```

### Launch backend and enroll certificate and create wallet

For create wallet you need enter to run:
```bash
docker exec -it {CONTAINER_NAME} yarn console enroll {PASS_PHRASE} sh
```