const knex = require('knex');
const knexfile = require('../knexfile');

const environment = process.env.NODE_ENV

module.exports = knex(knexfile[environment]);
