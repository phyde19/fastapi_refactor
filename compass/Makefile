SHELL := /bin/bash

.PHONY: setup setup_overlay setup_databricks redis backend frontend load_ports all

setup:
	@bash scripts/setup-hub.sh local

setup_overlay:
	@bash scripts/setup-hub.sh overlay

setup_databricks:
	@bash scripts/setup-hub.sh databricks

redis:
	@scripts/run-redis.sh

backend:
	@scripts/run-backend.sh

frontend:
	@scripts/run-frontend.sh

load_ports:
	@scripts/load-ports.sh

all: redis backend frontend
