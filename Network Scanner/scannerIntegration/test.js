const runNmapScan = require("./nmapScan");

runNmapScan().then(result => {
    console.log(result);
}).catch(err => {
    console.error(err);
});