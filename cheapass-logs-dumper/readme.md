# Logs dumper
---
This project will connect to sync server and listen to all logs and dump them to database.

## How to run

You can either use docker, or setup everything manually.

**Run using Docker:**

Docker compose will create two containers:

- mysql database container 
- dumping app container

Dumping app container will checkout the latest version from this repository on run.

In order to launch container:
1. Install Docker and Docker compose (both are contained in single Windows installer)
2. Create `docker/.env` file based on `docker/.env.example` file
3. Run `docker-compose up` or `docker-compose up --detach` to detach it from current terminal.

**Run without Docker:**

1. Install mysql instance
2. Create  mh_logs database and execute `docker/mysql/schema.sql` to create required table
3. Install node js
4. Create `.env` file based on `.env.example`
5. Run `npm i`
6. Run `npm start`
