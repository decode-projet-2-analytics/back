const connection = require('./lib/db');
require('./models/user');
require('./models/application');
require('./models/tag');
require('./models/tunnel');
require('./models/associations');

const method = process.argv[2]?.slice(2) ?? "alter";

connection
    .sync({
        [method]: true
    })
    .then(() => console.log("Database synced"))
    .then(() => connection.close());