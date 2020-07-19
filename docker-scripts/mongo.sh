#!/usr/bin/env bash

# docker-compose exec mongo mongo db_shopkeepr

docker-compose exec mongo mongodump -o /data-init/seed
