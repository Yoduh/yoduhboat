const fs = require('fs');

const getTimeDifference = (start, end) => {
    const startInSec = timestampToSeconds(start);
    const endInSec = timestampToSeconds(end);
    let diff = endInSec - startInSec;
    diff = Math.round((diff + Number.EPSILON) * 100) / 100

    return Number(diff);
}

const timestampToSeconds = (timestamp) => {
    // timestamp given is already in seconds
    if (!timestamp.includes(":")) {
        return Number(timestamp);
    }
    let ms = 0;
    if (timestamp.includes(".")) {
        let split = timestamp.split(".");
        timestamp = split[0];
        ms = Number("0." + split[1]);
    }
    return parseInt(timestamp.split(':').reduce((acc,time) => (60 * acc) + +time) + ms);
}
const replaceTempSound = (oldSound) => {
    const newSound = oldSound+"__TEMP";
    if (!fs.existsSync(`./sounds/${newSound}.opus`)) {
        return false;
    }
    fs.unlinkSync(`./sounds/${oldSound}.opus`)
    fs.renameSync(`./sounds/${newSound}.opus`, `./sounds/${oldSound}.opus`);
    return true;
}

exports.getTimeDifference = getTimeDifference;
exports.timestampToSeconds = timestampToSeconds;
exports.replaceTempSound = replaceTempSound;