#!/usr/bin/env bash

# Reference: https://stackoverflow.com/questions/192249/how-do-i-parse-command-line-arguments-in-bash

# Use -gt 1 to consume two arguments per pass in the loop (e.g. each
# argument has a corresponding value to go with it).
# Use -gt 0 to consume one or more arguments per pass in the loop (e.g.
# some arguments don't have a corresponding value to go with it such
# as in the --default example).
# note: if this is set to -gt 0 the /etc/hosts part is not recognized ( may be a bug )
while [[ $# -gt 1 ]]
do
key="$1"

case $key in
    --dir)
    DIR="$2"
    shift # past argument
    ;;
    --dirty)
    DIRTY="$2"
    shift # past argument
    ;;
    *)
            # unknown option
    ;;
esac
shift # past argument or value
done

DIR=${DIR:-"seed/dump"}
DIRTY=${DIRTY:-0}

echo $DIR
echo $DIRTY

if [ $DIRTY -lt 1 ]
then
  docker-compose exec mongo mongo db_shopkeepr --eval "db.dropDatabase();"
fi

docker-compose exec mongo mongorestore --dir /data-init/$DIR --batchSize=1000

