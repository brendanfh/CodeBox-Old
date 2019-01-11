FROM node:8.10.0

RUN yarn global add typescript
RUN apt-get update
RUN apt-get install -y libseccomp-dev
RUN apt-get install -y python3

COPY ./package.json /app/package.json
WORKDIR /app
RUN yarn

COPY ./executer/ /app/executer
COPY ./shared/ /app/shared
COPY ./Makefile /app/Makefile

ENV ROOT_DIR /comp
ENV PATH $(yarn global bin):$PATH
CMD ["make", "executer"]
