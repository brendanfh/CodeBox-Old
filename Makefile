SHELL := /bin/bash

build_all: build_server build_executer

build_server:
	pushd server; \
	tsc; \
	popd; \

build_executer:
	pushd executer; \
	tsc; \
	popd;

executer: build_executer
	node ./executer-compiled/executer/main.js

server: build_server
	node ./server-compiled/server/main.js
