#!/usr/bin/env bash

NODE_CONTAINER=${PWD##*/}_node
#NODE_CONTAINER=${NODE_CONTAINER/-/}

# Build the containers
docker-compose build


# Copy node_modules from container
echo "Copying .git/hooks & node_modules"
NEW_UUID=$(cat /dev/urandom | env LC_CTYPE=C tr -dc 'a-z0-9' | fold -w 32 | head -n 1)
CONTAINER_NAME=$NODE_CONTAINER-$NEW_UUID
rm -rf .git/hooks node_modules
docker run --name $CONTAINER_NAME --entrypoint ls > /dev/null $NODE_CONTAINER
docker cp $CONTAINER_NAME:/src/.git/hooks/ ./.git/hooks
docker cp $CONTAINER_NAME:/src/node_modules/ ./node_modules
docker stop $CONTAINER_NAME > /dev/null
docker rm $CONTAINER_NAME > /dev/null


# Copy yarn.lock & cache from container
docker run --rm --entrypoint cat $NODE_CONTAINER /src/yarn.lock > /tmp/yarn.lock
if ! diff -q yarn.lock /tmp/yarn.lock > /dev/null  2>&1; then
  echo "Saving yarn.lock"
  cp /tmp/yarn.lock yarn.lock
fi
