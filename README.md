# OpenAerialMap Server: Status publisher component

[![Circle CI](https://circleci.com/gh/hotosm/oam-server-status-publisher/tree/master.svg?style=svg)](https://circleci.com/gh/hotosm/oam-server-status-publisher/tree/master)
[![Docker Repository on Quay.io](https://quay.io/repository/hotosm/oam-server-status-publisher/status "Docker Repository on Quay.io")](https://quay.io/repository/hotosm/oam-server-status-publisher)

This component of OAM Server polls an SQS to watch for the status of tiling jobs. It will write the status to an S3 store that the API will use, and will hit the OAM Catalog endpoint
to notify when tiling jobs are done.

SQS message status look like:

```javascript
{ "jobId": "test-job", "stage": "chunk", "status": "STARTED" }
{ "jobId": "test-job", "stage": "chunk", "status": "FAILED", "error":  "so many errors" }
{ "jobId": "test-job", "stage": "chunk", "status": "FINISHED" }
{ "jobId": "test-job", "stage": "mosaic", "status": "STARTED" }
{ "jobId": "test-job", "stage": "mosaic", "status": "FAILED", "error": "scala errors oh my" }
{ "jobId": "test-job", "stage": "mosaic", "status": "FINISHED", "target": "s3://oam-tiles/test-job", "images": ["http://bucketname.s3.amazonaws.com/image1.tif", "http://bucketname.s3.amazonaws.com/image2.tif"] }
```

## Usage

The main avenue for developing against the OpenAerialMap (OAM) server is via Docker. To get started, ensure that you have a [working Docker environment](https://docs.docker.com/machine/), with version `>=1.7`. In addition, all interactions with Docker and NPM are wrapped within a `Makefile`.

In order to build this image, use the `publisher` target:

```bash
$ make publisher
Sending build context to Docker daemon  7.68 kB
Sending build context to Docker daemon

...

Successfully built e2666914b094
```

From there, you can start the server using the `start` target:

```bash
$ make start
b1d7b15d68632883ba81c6098719036caf3c4e23dff964666a42d736bee96a33
$ docker ps
CONTAINER ID        IMAGE                   COMMAND             CREATED             STATUS              PORTS                    NAMES
b1d7b15d6863        oam/server-publisher:latest   "npm start"         19 seconds ago      Up 16 seconds       0.0.0.0:8000->8000/tcp   oam-server-api
```

### Environment Variables

* `AWS_ACCESS_KEY_ID` - AWS access key id. Required unless an IAM role is in
  use.
* `AWS_SECRET_ACCESS_KEY` - AWS secret access key. Required unless an IAM role
* `AWS_DEFAULT_REGION` - AWS region. Required.
  is in use.
* `OAM_STATUS_SQS_QUEUE_URL` - SQS queue URL to listen for status updates on. Required.
* `OAM_UPLOADER_TOKEN` - OAM Catalog token. Required.
* `OAM_STATUS_BUCKET` - S3 bucket containing task statuses. Required.
* `OAM_STATUS_PREFIX` - Path prefix for task statuses. Required.
* `DEBUG` - Debug logging configuration. Set to `oam:*` for all messages.
  Optional.
