FROM docker.elastic.co/elasticsearch/elasticsearch-oss:6.8.0

# Remove unused modules
RUN rm -rf modules/aggs-matrix-stats
RUN rm -rf modules/ingest-common
RUN rm -rf modules/lang-expression
RUN rm -rf modules/lang-groovy
RUN rm -rf modules/lang-mustache
RUN rm -rf modules/percolator
RUN rm -rf modules/transport-netty3
