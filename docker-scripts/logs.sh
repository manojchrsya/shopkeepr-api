#!/usr/bin/env bash

while [[ $# -gt 1 ]]
do
key="$1"

case $key in
    --tail)
    TAIL="$2"
    shift # past argument
    ;;
    *)
     # unknown option
    ;;
esac
shift # past argument or value
done

TAIL=${TAIL:-1000}

docker-compose logs --tail=$TAIL --follow
