FROM node:4.2-slim

MAINTAINER Humanitarian OpenStreetMap Team

ENV HOME /app
ENV PORT 8000
ENV npm_config_loglevel warn

RUN useradd \
  --create-home \
  --home-dir /app \
  --user-group \
  oam

USER oam
WORKDIR /app

COPY ./package.json /app/

RUN npm install

COPY . /app

CMD npm start
