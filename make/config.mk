# make/config.mk

# --- OS ---
OS := $(shell uname)
CHIP := $(shell uname -m)

# --- Env ---
-include srcs/.env
-include srcs/.env.nginx
export

# --- Paths ---
PROJECT_PATH := $(shell pwd)
ifdef VOLUME_NAME
  VOLUMES_PATH := $(PROJECT_PATH)/$(VOLUME_NAME)
else
  VOLUMES_PATH := $(PROJECT_PATH)/data
endif
DATABASE_PATH := $(VOLUMES_PATH)/database
UPLOADS_PATH := $(VOLUMES_PATH)/uploads

CONTAINER_CMD := docker
COMPOSE_CMD   := docker compose

# Automatically injecting HOST_VOLUME_PATH at each compose command
D_COMPOSE := HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml
D_COMPOSE_DEV := HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/dev-docker-compose.yml
