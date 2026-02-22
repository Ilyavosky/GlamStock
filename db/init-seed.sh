#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 \
     -v admin_email="$ADMIN_EMAIL" \
     -v admin_password="$ADMIN_PASSWORD" \
     -U "$POSTGRES_USER" \
     -d "$POSTGRES_DB" \
     -f /docker/03_seed.sql