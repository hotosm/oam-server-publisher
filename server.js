"use strict";

var path = require("path"),
    url = require("url"),
    util = require("util");

var AWS = require("aws-sdk"),
    clone = require("clone"),
    debug = require("debug"),
    env = require("require-env"),
    exquisite = require("exquisite"),
    request = require("request");

var SQS_URL = env.require("OAM_STATUS_SQS_QUEUE_URL"),
    OAM_CATALOG_URL = process.env.OAM_CATALOG_URL || "https://api.openaerialmap.org/",
    OAM_API_TOKEN = env.require("OAM_API_TOKEN"),
    BUCKET = env.require("OAM_STATUS_BUCKET"),
    PREFIX = env.require("OAM_STATUS_PREFIX"),
    MOCK_OAM_API = process.env.MOCK_OAM_API === "true";

var log = debug("oam:publisher"),
    s3 = new AWS.S3();

var createTileJson = function(jobId, target, images) {
  var targetUrl = target;
  var parsed = url.parse(target);
  if (parsed.protocol === "s3:") {
    targetUrl = util.format("http://%s.s3.amazonaws.com%s", parsed.hostname, parsed.path);
  }
  return {
    tilejson: "2.1.0",
    name: util.format("OAM Server Mosaic %s", jobId),
    attribution: "<a href='http://github.com/openimagerynetwork/'>OIN contributors</a>",
    scheme: "xyz",
    tiles: [
      util.format("%s/{z}/{x}/{y}.png", targetUrl)
    ]
  };
};

var messageToStatus = function messageToStatus(msg) {
  if (isLastStageSuccess(msg.stage, msg.status)) {
    // clone and overwrite the message to preserve additional metadata
    var status = clone(msg);

    status.status = "SUCCESS";
    status.stage = "COMPLETE";
    status.tileJson = createTileJson(msg.jobId, msg.target, msg.images);

    return status;
  }

  return msg;
};

var logStatus = function logStatus(msg, callback) {
  var status = messageToStatus(msg),
      statusKey = path.join(PREFIX, msg.jobId + "-status.json"),
      statusPath = util.format("s3://%s/%s", BUCKET, statusKey),
      params = {
        Bucket: BUCKET,
        Key: statusKey,
        ACL: "bucket-owner-full-control",
        Body: JSON.stringify(status)
      };

  log("Writing status");

  return s3.putObject(params, function(err, data) {
    if (err) {
      log("Error writing to %s", statusPath);
      return callback(err);
    }

    log("Wrote status to %s", statusPath);
    log(status);

    return callback();
  });
};

var isLastStageSuccess = function isLastStageSuccess(stage, status) {
  return stage === "mosaic" && status === "FINISHED";
};

var notifyJobComplete = function(jobId, tms, images, callback) {
  images = images.map(function(x) {
    return {
      uuid: x.replace(/^\/vsicurl\//, "")
    };
  });

  if (MOCK_OAM_API) {
    log("Mock Hitting OAM Catalog endpoint for", jobId);

    console.log("Payload:", {
      uri: tms,
      images: images
    });

    return callback();
  }

  // Submit this TMS to https://api.openaerialmap.org/tms
  // see http://docs.openaerialmap.org/#api-TMS-PostTms
  return request.post({
    auth: {
      bearer: OAM_API_TOKEN
    },
    uri: OAM_CATALOG_URL + "tms",
    json: {
      uri: tms,
      images: images
    }
  }, callback);
};

var processMessage = function processMessage(msg, callback) {
  var jobId = msg.jobId,
      stage = msg.stage,
      status = msg.status;

  log("Got message: JobId = %s, Stage = %s, Status = %s", jobId, stage, status);

  return logStatus(msg, function(err) {
    if (err) {
      return callback(err);
    }

    if (isLastStageSuccess(stage, status)) {
      var images = msg.images,
          tms = messageToStatus(msg).tileJson.tiles[0];

      return notifyJobComplete(jobId, tms, images, callback);
    }

    return callback();
  });
};

var worker = exquisite({
  url: SQS_URL
}, processMessage);
