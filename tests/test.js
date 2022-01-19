const express = require('express');
const ExpressCluster = require('..').ExpressCluster;

const app = express()
const port = 3001
app.get('/', function (req, res) {
    console.log('PID', process.pid, ' Blocking CPU')
    var i = 0;
    while (i < 10e9) {
      i++;
    }
    console.log('PID', process.pid, ' Unblocked, responding')
    res.send('Process ' + process.pid + ' says hello!').end();
});

ExpressCluster((worker) => {
    // setTimeout(() => {
    //     if (worker.id == 1) {
    //         worker.disconnect();
    //     }
    // }, 3000);
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
});