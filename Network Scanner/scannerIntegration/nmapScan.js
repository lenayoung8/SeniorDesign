const { exec } = require("child_process");

function runNmapScan() {
    return new Promise((resolve, reject) => {
        exec("nmap -sn 127.0.0.1", (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

module.exports = runNmapScan;