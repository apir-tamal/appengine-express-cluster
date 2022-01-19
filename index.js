"use strict";

const cluster = require("cluster");

const Master = () => {
  const numWorkers = require("os").cpus().length;
  const workers = new Map();
  let autoRestart = true;
  //
  console.log("Master cluster setting up " + numWorkers + " workers...");
  //
  for (var i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.restartCount = 0;
    workers.set(worker.id, worker);
  }

  //
  cluster.on("online", (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
    worker.status = "online";
    workers.set(worker.id, worker);
  });

  cluster.on("disconnect", (worker) => {
    console.log(`Worker ${worker.id} with PID ${worker.process.pid} disconnected.`);
    worker.status = "disconnect";
    workers.set(worker.id, worker);
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(`${worker.id} died with ${signal || "exit code " + code}, Restarting...`);
    if (workers.has(worker.id)) {
      workers.delete(worker.id);
    }

    if (autoRestart && worker.restartCount < 5) {
      const newWorker = cluster.fork();
      newWorker.restartCount = worker.restartCount + 1;
      workers.set(newWorker.id, newWorker);
    } else {
      console.log(`Maximum restart limit reached for worker ${worker.id}`);
    }
  });

  process.on("uncaughtException", (error) => {
    console.log(`Uncaught exception: ${error.message}`);
    cluster.worker.disconnect();
  });

  process.on("SIGQUIT", () => {
    autoRestart = false;
    console.log("QUIT received, will exit once all workers have finished current requests");
    workers.forEach((worker) => {
      worker.send("quit");
    });
  });

  process.on("SIGTERM", () => {
    autoRestart = false;
    console.log("TERM received, will exit once all workers have finished current requests");
    workers.forEach((worker) => {
      worker.send("quit");
    });
  });

};

const Worker = (fn) => {
  fn(cluster.worker);
};

const ExpressCluster = (fn, app) => {
  //
  if (typeof fn !== "function") {
    throw "Callback function needed!";
  }

  //
  if (typeof app === "function") {
    // liveness_check
    app.use("/liveness_check", function (req, res) {
      res.status(200).send(`healthy`);
    });

    // readiness_check
    app.use("/readiness_check", function (req, res) {
      res.status(200).send(`healthy`);
    });
  }

  // 
  if (cluster.isMaster) {
    return Master();
  } else {
    return Worker(fn);
  }
};

module.exports = { ExpressCluster };
