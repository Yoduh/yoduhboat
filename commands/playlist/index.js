const add = require("./add");
const create = require("./create");
const deletePlaylist = require("./delete");
const details = require("./details");
const remove = require("./remove");
const { listCommand } = require("./list");

exports.add = add;
exports.create = create;
exports.delete = deletePlaylist;
exports.details = details;
exports.remove = remove;
exports.list = listCommand;