const command = (entrances, message) => {
    newEntrances = !entrances;
    if (newEntrances) {
        message.channel.send("Entrance music is turned ON");
    } else {
        message.channel.send("Entrance music is turned OFF");
    }
    return newEntrances;
}

module.exports = command;