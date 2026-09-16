#!/usr/bin/env bash
cat /home/ubuntu/align_ride_schema.sql | docker exec -i rac3011-postgres psql -U rac3011 -d rac3011
