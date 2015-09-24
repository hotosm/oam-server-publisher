FROM node:0.10-slim

MAINTAINER Humanitarian OpenStreetMap Team

ENV HOME /app
ENV PORT 8000

RUN mkdir -p /app/publisher
WORKDIR /app

COPY ./publisher/package.json /app/

RUN npm install

RUN useradd \
  --home-dir /app/publisher \
  --system \
  --user-group \
  oam \
  && chown -R oam:oam /app

USER oam
WORKDIR /app/publisher

COPY publisher/ /app/publisher

ENTRYPOINT ["npm"]
