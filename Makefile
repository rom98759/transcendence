OS := $(shell uname)

# Try to load .env file if it exists
-include srcs/.env
export
ifeq ($(OS), Linux)
	VOLUMES_PATH := $(shell pwd)/data
	PROJECT_PATH := $(shell pwd)
else
	VOLUMES_PATH := $(shell pwd)/volumes
	PROJECT_PATH := $(shell pwd)
endif


# Override VOLUMES_PATH if HOST_VOLUME_PATH is set in .env
ifdef HOST_VOLUME_PATH
	VOLUMES_PATH := $(shell pwd)/$(HOST_VOLUME_PATH)
endif

JM = $(findstring Jean, $(shell uname -a))

ifeq ($(JM), Jean)
	CONTAINER_CMD=podman
	COMPOSE_CMD=podman-compose
else
	CONTAINER_CMD=docker
	COMPOSE_CMD=docker compose
endif

all : volumes build
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d
# Detect if volumes exist and Colima needs restart
volumes:
	@echo "Configuring volumes at $(VOLUMES_PATH)"
ifeq ($(OS), Darwin)
	@if [ ! -d "$(VOLUMES_PATH)" ]; then \
		echo "Creating new volume path, Colima restart required"; \
		mkdir -p $(VOLUMES_PATH); \
		chmod -R 777 $(VOLUMES_PATH); \
		if colima list 2>/dev/null | grep -q "Running"; then \
			echo "Stopping Colima to mount new path..."; \
			colima stop; \
		fi; \
		$(MAKE) colima; \
	else \
		echo "Volume path exists: $(VOLUMES_PATH)"; \
		mkdir -p $(VOLUMES_PATH); \
		chmod -R 777 $(VOLUMES_PATH); \
	fi
else
	@mkdir -p $(VOLUMES_PATH)
	@chmod -R 777 $(VOLUMES_PATH)
endif

dev: colima-dev
	$(COMPOSE_CMD) -f srcs/dev-docker-compose.yml up --build -d

colima-dev:
ifeq ($(OS),Darwin)
	@echo "Checking Colima status and mounts..."
	@colima status --verbose | grep -q "$(PROJECT_PATH)" || \
	( echo "Starting Colima with mount $(PROJECT_PATH)..." && \
	  colima start --mount "$(PROJECT_PATH):w" --vm-type vz )
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
	
nginx:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build nginx-proxy
redis:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build redis-broker
api:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build api-gateway
auth:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build auth-service
user:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build users-management
game:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build game-service
block:
	HOST_VOLUME_PATH=$(VOLUMES_PATH) $(COMPOSE_CMD) -f srcs/docker-compose.yml up -d --build blockchain-service
build:
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
	$(CONTAINER_CMD) logs -f nginx-proxy
logs-api:
	$(CONTAINER_CMD) logs -f api-gateway
logs-auth:
	$(CONTAINER_CMD) logs -f auth-service
logs-game:
	$(CONTAINER_CMD) logs -f game-service

re : fclean all

show:
	$(CONTAINER_CMD) images
	$(CONTAINER_CMD) volume ls
	$(CONTAINER_CMD) ps
	$(CONTAINER_CMD) network ls

# clean : stop
# 	$(CONTAINER_CMD) system prune -f
# 	@if [ -n "$$($(CONTAINER_CMD) ps -q)" ]; then $(CONTAINER_CMD) stop $$($(CONTAINER_CMD) ps -q); else echo "No running containers to stop."; fi
# 	@if [ -n "$$($(CONTAINER_CMD) ps -aq)" ]; then $(CONTAINER_CMD) rm -f $$($(CONTAINER_CMD) ps -aq); else echo "No running containers to remove."; fi
# 	@if [ -n "$$($(CONTAINER_CMD) -q)" ]; then $(CONTAINER_CMD) rmi -f $$($(CONTAINER_CMD) images -q); else echo "No images to remove."; fi
# 	@if [ -n "$$($(CONTAINER_CMD) volume ls -q)" ]; then $(CONTAINER_CMD) volume rm $$($(CONTAINER_CMD) volume ls -q); else echo "No volumes to remove."; fi
#
# fclean: clean
# 	$(CONTAINER_CMD) system prune -a --volumes --force
# 	$(CONTAINER_CMD) network prune
# 	rm -fr $(VOLUMES_PATH)

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
# Full clean WITH volumes, but NOT images
# fclean: clean
# 	@echo "Removing volumes and networks…"
# 	-$(CONTAINER_CMD) volume prune -f
# 	-$(CONTAINER_CMD) network prune -f
# 	rm -rf $(VOLUMES_PATH)

# Dangerous full reset
# reset-hard:
# 	@echo "WARNING: This will delete ALL images, ALL volumes and ALL networks"
# 	sleep 3
# 	$(CONTAINER_CMD) system prune -a --volumes --force
# 	rm -rf $(VOLUMES_PATH)
# Hard reset - deletes everything including folder
reset-hard: clean
	@echo "WARNING: Full reset including Colima restart"
	-$(CONTAINER_CMD) volume prune -f
	-$(CONTAINER_CMD) network prune -f
	-$(CONTAINER_CMD) system prune -a --volumes --force
ifeq ($(OS), Darwin)
	@echo "Stopping Colima…"
	-colima stop
	rm -rf $(VOLUMES_PATH)
	@echo "Restarting Colima with fresh mount…"
	$(MAKE) colima
else
	rm -rf $(VOLUMES_PATH)
endif
# ifeq ($(OS), Darwin)
# 	colima stop && colima delete
# endif
.PHONY : all clean fclean re build volumes colima nginx redis api auth user stop down logs logs-nginx logs-api logs-auth
