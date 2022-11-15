"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _crypto = _interopRequireDefault(require("crypto"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Sidekiq = function Sidekiq(redisConnection) {
  var _this = this;

  var namespace = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  _classCallCheck(this, Sidekiq);

  _defineProperty(this, "generateJobId", function () {
    try {
      var token = _crypto["default"].randomBytes(12);

      return token.toString("hex");
    } catch (error) {
      throw error;
    }
  });

  _defineProperty(this, "getQueueName", function (queueName) {
    return queueName || "default";
  });

  _defineProperty(this, "namespaceKey", function (key) {
    if (_this.namespace) return "".concat(_this.namespace, ":").concat(key);
    return key;
  });

  _defineProperty(this, "getQueueKey", function (queueName) {
    return _this.namespaceKey("queue:".concat(_this.getQueueName(queueName)));
  });

  _defineProperty(this, "enqueue", function (workerClass, args) {
    var payload = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var cb = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};
    var self = _this;

    var jid = _this.generateJobId();

    var now = new Date().getTime() / 1000;
    payload["class"] = workerClass;
    payload.args = args;
    payload.jid = jid;
    payload.created_at = now;
    payload.enqueued_at = now;
    if (typeof payload.retry === "undefined") payload.retry = true;

    if (payload.at instanceof Date) {
      payload.enqueued_at = payload.at.getTime() / 1000;
      payload.at = payload.enqueued_at;

      _this.redisConnection.zAdd(_this.namespaceKey("schedule"), [{
        score: payload.enqueued_at,
        value: JSON.stringify(payload)
      }], cb);
    } else {
      _this.redisConnection.lPush(_this.getQueueKey(payload.queue), JSON.stringify(payload), function (err) {
        if (err) {
          return cb(err);
        } else {
          return self.redisConnection.sAdd(self.namespaceKey("queues"), self.getQueueName(payload.queue), cb);
        }
      });
    }
  });

  this.redisConnection = redisConnection;
  this.namespace = namespace;
};

var _default = Sidekiq;
exports["default"] = _default;