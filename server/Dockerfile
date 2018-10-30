FROM node:8.10.0

COPY ./server/ /app/server
COPY ./shared/ /app/shared
COPY ./web/ /app/web
COPY ./Makefile /app/Makefile
COPY ./package.json /app/package.json

WORKDIR /app

RUN yarn
RUN yarn global add typescript

EXPOSE 80
EXPOSE 443

ENV ROOT_DIR /comp
ENV PATH $(yarn global bin):$PATH
CMD ["make", "server"]
