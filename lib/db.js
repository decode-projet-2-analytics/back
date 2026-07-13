const Sequelize = require('sequelize');
const { resolveDatabaseUrl } = require('./database-url');

const connection = new Sequelize(resolveDatabaseUrl());

connection.authenticate().then(() => console.log("Database connected"));

module.exports = connection;
