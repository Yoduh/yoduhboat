const fs = require('fs');

const getMetadata = (name) => {
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    let soundData = data.find(s => s.name === name.toLowerCase())
    return soundData;
}

const writeMetadata = (name, link, start, duration, user) => {
    let metadata = {
        name: name.toLowerCase(),
        description: "",
        link: link,
        start: start,
        duration: duration,
        user: user,
        created: new Date().toLocaleString() + " (ET)",
        tags: []
    };
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    // insert name in alphabetical order somewhere in list
    for (let i = 0; i < data.length; i++) {
        if (data[i].name.toLowerCase() > metadata.name) {
            data.splice(i, 0, metadata);
            break;
        } else if (i === data.length - 1) {
            data.push(metadata);
            break;
        }
    }
    fs.writeFileSync("./descriptions.json", JSON.stringify(data, null, "\t"));
}

const removeMetadata = (args) => {
}

const updateDescription = (name, description) => {
    let data = JSON.parse(fs.readFileSync("./descriptions.json"));
    let soundData = data.find(s => s.name === name.toLowerCase())
    soundData.description = description;
    fs.writeFileSync("./descriptions.json", JSON.stringify(data, null, "\t"));
}

exports.get = getMetadata;
exports.write = writeMetadata;
exports.remove = removeMetadata;
exports.updateDescription = updateDescription;