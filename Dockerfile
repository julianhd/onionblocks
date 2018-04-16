FROM node:8

WORKDIR /home/node/app

COPY public /home/node/app/public
COPY src /home/node/app/src
COPY package-lock.json package.json tsconfig.json /home/node/app/

RUN npm install
RUN npm run build

RUN mkdir data
VOLUME /home/node/app/data

RUN apt-get update && apt-get install -y wget
ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
  && tar -C /usr/local/bin -xzvf dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
  && rm dockerize-linux-amd64-$DOCKERIZE_VERSION.tar.gz

CMD node lib/server.js

EXPOSE 80
