const { exec } = require("child_process");

function capturePackets() {
    return new Promise((resolve, reject) => {
        exec("tshark -i 1 -T json -c 10", (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(JSON.parse(stdout));
            }
        });
    });
}

module.exports = capturePackets;