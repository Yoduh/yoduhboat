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
    if (!String(timestamp).includes(":")) {
        return Number(timestamp);
    }
    let ms = 0;
    if (timestamp.includes(".")) {
        let split = timestamp.split(".");
        timestamp = split[0];
        ms = Number("0." + split[1]);
    }
    let res = parseInt(timestamp.split(':').reduce((acc,time) => (60 * acc) + +time) + ms);
    return res;
}
const secondsToTimestamp = (seconds) => {
    if (String(seconds).includes(":")) {
        return seconds;
    } else {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds - Math.floor(seconds)) * 100);
        let res = [
        h > 0 ? h : '',
        h > 0 && m <= 9 ? '0' + m : m || '0',
        s > 9 ? s : '0' + s
        ]
        .filter(Boolean)
        .join(':');
        res += '.' + (ms > 9 ? ms : '0' + ms);
        return res;
    }
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
exports.secondsToTimestamp = secondsToTimestamp;