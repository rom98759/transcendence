OS := $(shell uname)

# Try to load .env file if it exists
-include srcs/.env
export
PROJECT_PATH := $(shell pwd)
VOLUMES_PATH := $(PROJECT_PATH)/data
UPLOADS_PATH := $(VOLUMES_PATH)/uploads

# Override VOLUMES_PATH if HOST_VOLUME_PATH is set in .env
ifdef VOLUME_NAME
	VOLUMES_PATH := $(PROJECT_PATH)/$(VOLUME_NAME)
endif

JM = $(findstring Jean, $(shell uname -a))

ifeq ($(JM), Jean)
	CONTAINER_CMD=podman
	COMPOSE_CMD=podman-compose
else
	CONTAINER_CMD=docker
	COMPOSE_CMD=docker compose
endif

all : volumes colima build
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d

volumes:
	@mkdir -p $(VOLUMES_PATH)
	@mkdir -p $(UPLOADS_PATH)
	@chmod -R 777 $(VOLUMES_PATH)

dev: volumes colima-dev
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/dev-docker-compose.yml up --build -d

colima-dev:
ifeq ($(OS),Darwin)
	@echo "Checking Colima status and mounts..."
	@if ! colima list 2>/dev/null | grep -q "Running"; then \
		echo "Starting Colima with mount $(PROJECT_PATH)"; \
		colima start --mount "$(PROJECT_PATH):w" --vm-type vz; \
	else \
		echo "Colima is running, checking mounts..."; \
		if ! colima status 2>/dev/null | grep -q "$(PROJECT_PATH)"; then \
			echo "Mount missing, restarting Colima with correct mount..."; \
			colima stop; \
			colima start --mount "$(PROJECT_PATH):w" --vm-type vz; \
		else \
			echo "Mount already configured: $(PROJECT_PATH)"; \
		fi; \
	fi
endif

colima:
	@echo "system is : $(OS)"
ifeq ($(OS), Darwin)
	colima start --mount $(VOLUMES_PATH):w --vm-type vz
endif

check:
	npx prettier . --check
format:
	npx prettier . --write

core:
	npm run build --workspace srcs/shared/core	
nginx: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(PROXY_SERVICE_NAME)
redis: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(REDIS_SERVICE_NAME)
api: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(API_GATEWAY_NAME)
auth: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(AUTH_SERVICE_NAME)
user: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(UM_SERVICE_NAME)
game: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(GAME_SERVICE_NAME)
block: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build $(BK_SERVICE_NAME)
build: core
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml build

start :
	$(COMPOSE_CMD) -f srcs/docker-compose.yml start 
stop :
	$(COMPOSE_CMD) -f srcs/docker-compose.yml stop 
down :
	$(COMPOSE_CMD) -f srcs/docker-compose.yml down

logs:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml logs -f
logs-nginx:
	$(CONTAINER_CMD) logs -f $(PROXY_SERVICE_NAME)
logs-api:
	$(CONTAINER_CMD) logs -f $(API_GATEWAY_NAME)
logs-auth:
	$(CONTAINER_CMD) logs -f $(AUTH_SERVICE_NAME)
logs-game:
	$(CONTAINER_CMD) logs -f $(GAME_SERVICE_NAME)
logs-user:
	$(CONTAINER_CMD) logs -f $(UM_SERVICE_NAME)
logs-bk:
	$(CONTAINER_CMD) logs -f $(BK_SERVICE_NAME)
logs-redis:
	$(CONTAINER_CMD) logs -f $(REDIS_SERVICE_NAME)
re : fclean all

show:
	$(CONTAINER_CMD) images
	$(CONTAINER_CMD) volume ls
	$(CONTAINER_CMD) ps
	$(CONTAINER_CMD) network ls

# Clean WITHOUT deleting images → SAFE
clean:
	@echo "Stopping and removing containers…"
	@if [ -n "$$($(CONTAINER_CMD) ps -q)" ]; then $(CONTAINER_CMD) stop $$($(CONTAINER_CMD) ps -q); else echo "No running containers to stop."; fi
	@if [ -n "$$($(CONTAINER_CMD) ps -aq)" ]; then $(CONTAINER_CMD) rm -f $$($(CONTAINER_CMD) ps -aq); else echo "No running containers to remove."; fi
	@echo "Pruning unused resources (SAFE)…"
	$(CONTAINER_CMD) system prune -f

# Clean contents but preserve structure
fclean: clean
	@echo "Removing volumes and networks…"
	-$(CONTAINER_CMD) volume prune -f
	-$(CONTAINER_CMD) network prune -f
	@echo "Cleaning volume contents…"
	@if [ -d "$(VOLUMES_PATH)" ]; then \
		find $(VOLUMES_PATH) -mindepth 1 -delete || true; \
	fi
	@echo "Volume folder cleaned (structure preserved)"
	@echo "Cleaning local build artifacts..."
	rm -rf node_modules
	rm -rf srcs/shared/core/dist
	rm -rf srcs/*/dist

# Hard reset - deletes everything including folder
reset-hard: clean
	@echo "WARNING: Full reset including Colima stop"
	-$(CONTAINER_CMD) volume prune -f
	-$(CONTAINER_CMD) network prune -f
	-$(CONTAINER_CMD) system prune -a --volumes --force
ifeq ($(OS), Darwin)
	@echo "Stopping Colima…"
	-colima stop
	rm -rf $(VOLUMES_PATH)
else
	rm -rf $(VOLUMES_PATH)
endif
# ifeq ($(OS), Darwin)
# 	colima stop && colima delete
# endif
.PHONY : all clean fclean re build volumes colima setup core nginx redis api auth user stop down logs logs-nginx logs-api logs-auth
