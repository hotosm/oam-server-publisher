"use strict";

var path = require("path"),
    url = require("url"),
    util = require("util");

var AWS = require("aws-sdk"),
    env = require("require-env"),
    exquisite = require("exquisite");

var SQS_URL = env.require("OAM_STATUS_SQS_QUEUE_URL"),
    TOKEN = env.require("OAM_UPLOADER_TOKEN"),
    BUCKET = env.require("OAM_STATUS_BUCKET"),
    PREFIX = env.require("OAM_STATUS_PREFIX"),
    DEBUG = true;

var s3 = new AWS.S3();

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
    return {
      status: "SUCCESS",
      stage: "COMPLETE",
      tileJson: createTileJson(msg.jobId, msg.target, msg.images)
    };
  }

  return msg;
};

var logStatus = function logStatus(msg, callback) {
  var status = messageToStatus(msg);
  var statusKey = path.join(PREFIX, msg.jobId + "-status.json");
  var statusPath = util.format("s3://%s/%s", BUCKET, statusKey);
  var params = {
    Bucket: BUCKET,
    Key: statusKey,
    ACL: "bucket-owner-full-control",
    Body: JSON.stringify(status)
  };
  console.log("Writing status");
  s3.putObject(params, function(err, data) {
    if (err) {
      console.log("Error writing to %s", statusPath);
      return callback(err);
    }

    console.log("Wrote status to %s", statusPath);
    console.log(JSON.stringify(status, null, 2));
    return callback();
  });
};

var isLastStageSuccess = function isLastStageSuccess(stage, status) {
  return stage === "mosaic" && status === "FINISHED";
};

var notifyJobComplete = function(jobId, images,callback) {
  // Hit OAM Catalog's endpoint
  if (DEBUG) {
    console.log("Mock Hitting OAM Catalog endpoint for", jobId);
    return callback();
  }

  // Post to https://oam-catalog.herokuapp.com/tms for each image
  // http://docs.openaerialmap.org/#api-TMS-PostTms

  return callback();
};

var processMessage = function processTask(msg, callback) {
  var jobId = msg.jobId,
      stage = msg.stage,
      status = msg.status;

  console.log("Got message: JobId = %s, Stage = %s, Status = %s", jobId, stage, status);

  return logStatus(msg, function(err) {
    if (err) {
      return callback(err);
    }

    if (isLastStageSuccess(stage, status)) {
      var images = msg.images;
      return notifyJobComplete(jobId, images, function(err) {
        if (err) {
          return callback(err);
        }

        return callback();
      });
    }

    return callback();
  });
};

var worker = exquisite({
  url: SQS_URL
}, processMessage);
