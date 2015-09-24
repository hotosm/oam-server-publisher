DOCKER_IMAGE = oam/server-publisher:latest

all: publisher

publisher:
	@docker build -f ./Dockerfile -t $(DOCKER_IMAGE) .

start: publisher
	@docker run \
		--detach \
		--name oam-server-publisher \
		--publish 8000:8000 \
		--volume $(PWD)/publisher:/app/publisher \
		$(DOCKER_IMAGE) start

test: start
	@sleep 1

	@docker run \
		--rm \
		--name oam-server-publisher-test \
		--link oam-server-publisher:oam-server-publisher \
		--volume $(PWD)/publisher:/app/publisher \
		$(DOCKER_IMAGE) test

	@docker kill oam-server-publisher >> /dev/null
	@docker rm oam-server-publisher >> /dev/null

clean:
	@docker kill oam-server-publisher >> /dev/null 2>&1 || true
	@docker rm oam-server-publisher >> /dev/null 2>&1 || true


.PHONY: all publisher start test clean
