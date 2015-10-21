DOCKER_IMAGE = oam/server-publisher:latest

all: publisher

publisher:
	@docker build -f ./Dockerfile -t $(DOCKER_IMAGE) .

start: publisher
	@docker run \
		--rm \
		-it \
		--name oam-server-publisher \
		--env-file .env \
		--volume $(PWD)/publisher:/app/publisher \
		$(DOCKER_IMAGE)

.PHONY: all publisher start
