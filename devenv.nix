{ pkgs, ... }:

let
  dbName = "moneyapp";
  dbUser = "postgres";
  dbPassword = "admin";
  dbHost = "localhost";
  dbPort = "5432";
  dbSchema = "public";
  appPort = "3000";
  appHost = "localhost";
  minioAccessKey = "minio_access_key";
  minioSecretKey = "minio_secret_key";
  minioRegion = "us-east-1";
  minioBucket = "moneyapp";
  minioEndpoint = "http://localhost:9000";
in
{
  name = "Trusted Payments Backend";

  dotenv.enable = true;

  env = {
    DOCKER_CONFIG = "../devops/out/docker";
    DOCKER_REGISTRY = "moneyapp";
    DOCKER_REGISTRY_URL = "registry.digitalocean.com";

    BETTER_AUTH_SECRET = "DDmfwTRRAfBgsKBtYVFamzei17C3VwPu";
    BETTER_AUTH_URL = "http://${appHost}:${appPort}";

    DB_HOST = dbHost;
    DB_PORT = dbPort;
    DB_PASS = dbPassword;
    DB_NAME = dbName;
    DB_USER = dbUser;
    DATABASE_URL = "postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schemas=${dbSchema}";

    LOG_LEVEL = "debug";
    NODE_ENV = "development";
    EXPOSE_API_DOCS = "true";
    TZ = "Europe/Budapest";
    AUTO_MIGRATE = "false";

    MAIL_PROVIDER = "nodemailer";
    MAIL_FROM = "noreply@yourapp.com";
    SMTP_HOST = "127.0.0.1";
    SMTP_PORT = "1025";
    SMTP_SECURE = "false";
    SMTP_USER = "your-email@gmail.com";
    SMTP_PASS = "your-app-password";
    MAILGUN_API_KEY = "your-mailgun-api-key";
    MAILGUN_DOMAIN = "your-mailgun-domain.com";
    MAILGUN_BASE_URL = "https://api.mailgun.net";

    S3_BUCKET = minioBucket;
    S3_REGION = minioRegion;
    S3_ACCESS_KEY = minioAccessKey;
    S3_SECRET_KEY = minioSecretKey;
    S3_ENDPOINT = minioEndpoint;

    TEST_ROOT = "http://${appHost}:${appPort}";
  };

  packages = [
    pkgs.git
    pkgs.biome
    pkgs.wait4x
    pkgs.harper
    # opcionális, ha kell a docker CLI / ngrok / mc:
    # pkgs.docker-client
    # pkgs.docker-buildx
    # pkgs.ngrok
    # pkgs.minio-client
  ];

  languages = {
    javascript = {
      enable = true;
      bun = {
        enable = true;
        install.enable = true;
      };
    };
    typescript.enable = true;
    nix.enable = true;
  };

  services = {
    mailpit.enable = true;

    postgres = {
      enable = true;
      createDatabase = false;

      # Postgres 15 + pg_uuidv7 extension
      package = pkgs.postgresql_17;
      extensions = extensions: [ extensions.pg_uuidv7 ];

      initialDatabases = [
        {
          name = dbName;
          user = dbUser;
          pass = dbPassword;
          initialSQL = ''
            CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
          '';
        }
      ];

      listen_addresses = "*";
      port = 5432;
    };

  };

  process.manager.implementation = "process-compose";

  processes = {
    api-dev = {
      exec = "bun run dev | bunx pino-pretty --colorize --translateTime HH:MM:ss";
      process-compose.depends_on = {
        postgres.condition = "process_healthy";
        # minio-nak nincs healthcheck-je a devenv-ben, elég a started:
        minio.condition = "process_started";
      };
    };

    # ha kell külön mail dev process:
    # mail-dev.exec = "bun email";
  };

  scripts."be:hello" = {
    exec = ''
      export DB_URL=postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME
      echo DB Connection: $DB_URL
    '';
    description = "Prints the database connection string";
  };

  scripts."migrate:auth" = {
    exec = ''bunx --bun @better-auth/cli migrate --config ./src/utils/auth.ts'';
    description = "Run auth migrations";
  };

  scripts."auth:generate" = {
    exec = ''bunx --bun @better-auth/cli generate --config ./src/utils/auth.ts'';
    description = "Generate auth migrations";
  };

  scripts."codegen:db-types" = {
    exec = ''
      bun run kysely-codegen
      db2dbml postgres $DATABASE_URL -o ./src/db/schema.dbml
    '';
    description = "Generate database types";
  };

  scripts."tag:push" = {
    exec = ''
      docker logout
      docker login $DOCKER_REGISTRY_URL
      docker buildx build --platform linux/amd64 -t $DOCKER_REGISTRY_URL/$DOCKER_REGISTRY/backend:latest .
      docker push $DOCKER_REGISTRY_URL/$DOCKER_REGISTRY/backend:latest
    '';
    description = "Build and push backend image to registry";
  };

  scripts."seed:base" = {
    exec = ''
      echo "Seeding base data"
      wait4x postgresql "postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable" \
        --backoff-policy exponential \
        --backoff-exponential-coefficient 2.0 \
        --backoff-exponential-max-interval 10s -- \
        bun --bun run seed
    '';
    description = "Run base seed";
  };


  scripts."migrations:make" = {
    exec = ''
      bun --bun run kysely migrate make $1
      bun run generate-index.ts --dir ./migrations --namespace
    '';
    description = "Create a new migration file";
  };

  
  scripts."clean:logs" = {
    exec = ''rm -rf ./logs/*.log'';
    description = "Clean up log files";
  };

  scripts."reboot:local" = {
    exec = ''
      migrations:down
      migrations:up
      seed:base
      seed:local
      echo "Local environment rebooted successfully"
    '';
    description = "Reboot local environment by rolling back and running migrations, then seeding the database";
  };

  scripts."codegen:mjml" = {
    description = "Generate templates from MJML files";
    exec = ''
      mjml -r ./assets/email_templates/*.mjml --config.minify true --config.beautify false -o ./src/assets/email_templates
    '';
  };

  scripts."tunnel:ngrok" = {
    description = "Start ngrok tunnel";
    exec = ''
      if [ -n "$NGROK_DOMAIN" ]; then
        ngrok http --domain="$NGROK_DOMAIN" http://localhost:3000
      else
        ngrok http http://localhost:3000
      fi
    '';
  };

  enterShell = ''
    be:hello
    git --version
  '';

  enterTest = ''
    echo "Running tests"
    reboot:local
    bun test
  '';
}
