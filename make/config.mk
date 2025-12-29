# make/config.mk

# --- OS ---
OS := $(shell uname)

# --- Env ---
-include srcs/.env
export

# --- Paths ---
PROJECT_PATH := $(shell pwd)
ifdef VOLUME_NAME
  VOLUMES_PATH := $(PROJECT_PATH)/$(VOLUME_NAME)
else
  VOLUMES_PATH := $(PROJECT_PATH)/data
endif
UPLOADS_PATH := $(VOLUMES_PATH)/uploads

# --- Docker or Podman ---
JM := $(findstring Jean, $(shell uname -a))

ifeq ($(JM), Jean)
  CONTAINER_CMD := podman
  COMPOSE_CMD   := podman-compose
else
  CONTAINER_CMD := docker
  COMPOSE_CMD   := docker compose
endif

# --- Shortcuts ---
N_BUILD_WK := npm run build --workspace srcs
# Automatically injecting HOST_VOLUME_PATH at each compose command
D_COMPOSE := HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml
D_COMPOSE_DEV := HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/dev-docker-compose.yml