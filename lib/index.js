/**
 * hapi-sequelize
 *
 * A Hapi plugin for the Sequelize ORM
 *
 * ## config
 * {
 *  instances: [{
 *    name: 'dbname',
 *    models: ['path/one/*.js', 'path/two/*.js'],
 *    sequelize: new Sequelize(options),
 *    sync: true,
 *    forceSync: false,
 *    onConnect: function (database) { ... },
 *    debug: true
 *  }]
 * }
 *
 * @exports HapiSequelize
 */

"use strict";

const Joi = require("joi");
const Schema = require("./schema");
const Models = require("./models");
const DB = require("./DB");
const Pkg = require("../package.json");

async function configure(instance = {}) {
  const { forceSync, models, name, onConnect, sequelize, sync } = instance;

  if (!sequelize)
    throw new Error(`Missing sequelize attribute in instance "${name}"`);

  await sequelize.authenticate();

  const sequelizeModels = Models.applyRelations(
    Models.load(Models.getFiles(models), sequelize.import.bind(sequelize))
  );

  if (sync) {
    await sequelize.sync({ force: forceSync });
  }

  const database = new DB(sequelize, sequelizeModels);

  if (onConnect) {
    await onConnect(sequelize);
  }

  return database;
}

const HapiSequelize = {
  pkg: Pkg,
  register: async function register(server, options) {
    if (!options || !options.instances)
      throw new Error('Missing hapi-sequelize plugin "instances" option');

    const { instances } = options;
    const validation = Joi.validate(instances, Schema.instances);
    if (!validation || validation.error) throw validation.error;

    const getDb = request => name => {
      if (!name || !request.server.plugins[Pkg.name].hasOwnProperty(name)) {
        const key = Object.keys(request.server.plugins[Pkg.name]).shift();
        return request.server.plugins[Pkg.name][key];
      }
      return request.server.plugins[Pkg.name][name];
    };

    server.decorate("request", "getDb", getDb, { apply: true });

    await Promise.all(
      instances.reduce(
        (acc, instance) => [
          ...acc,
          configure(instance).then(db => {
            server.expose(instance.name, db);
            return db;
          })
        ],
        []
      )
    );
  }
};

module.exports = HapiSequelize;
