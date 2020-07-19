FROM node:10.16.0

ENV TZ=Asia/Kolkata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN curl -o- -L https://yarnpkg.com/install.sh | bash

RUN yarn global add nodemon

COPY package.json yarn.lock /src/
WORKDIR /src

ENV GIT_DISCOVERY_ACROSS_FILESYSTEM=1
RUN git init

RUN yarn

CMD ["./entrypoint.sh"]
