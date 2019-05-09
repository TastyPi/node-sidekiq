import crypto from "crypto";

class Sidekiq {
  constructor(redisConnection, namespace = null) {
    this.redisConnection = redisConnection;
    this.namespace = namespace;
  }

  generateJobId = () => {
    try {
      const token = crypto.randomBytes(12);
      return token.toString("hex");
    } catch (error) {
      throw error;
    }
  };

  getQueueName = queueName => queueName || "default";

  namespaceKey = key => {
    if (this.namespace) return `${this.namespace}:${key}`;
    return key;
  };

  getQueueKey = queueName => {
    return this.namespaceKey(`queue:${this.getQueueName(queueName)}`);
  };

  enqueue = (workerClass, args, payload = {}, cb = () => {}) => {
    const self = this;
    const jid = this.generateJobId();
    const now = new Date().getTime() / 1000;

    payload["class"] = workerClass;
    payload.args = args;
    payload.jid = jid;
    payload.created_at = now;
    payload.enqueued_at = now;

    if (typeof payload.retry === "undefined") payload.retry = true;

    if (payload.at instanceof Date) {
      payload.enqueued_at = payload.at.getTime() / 1000;
      this.redisConnection.zadd(
        this.namespaceKey("schedule"),
        payload.enqueued_at,
        JSON.stringify(payload),
        cb
      );
    } else {
      this.redisConnection.lpush(
        this.getQueueKey(payload.queue),
        JSON.stringify(payload),
        err => {
          if (err) {
            return cb(err);
          } else {
            return self.redisConnection.sadd(
              self.namespaceKey("queues"),
              self.getQueueName(payload.queue),
              cb
            );
          }
        }
      );
    }
  };
}

export default Sidekiq;
