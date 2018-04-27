/* eslint-disable no-unused-vars */

"use strict";

// Load modules
const Lab = require("lab");
const Code = require("code");
const Sinon = require("sinon");
const Hapi = require("hapi");
const Sequelize = require("sequelize");

// Test shortcuts
const lab = (exports.lab = Lab.script());
const test = lab.test;
const expect = Code.expect;

// Test DB
const host = process.env.MYSQL_HOST || "127.0.0.1";
const port = process.env.MYSQL_PORT || "3306";
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "";

lab.suite("@fredguile/hapi-sequelize", () => {
  test("plugin works with multiple instances", { parallel: true }, async () => {
    const server = new Hapi.Server();
    const spy = Sinon.spy(sequelize => server.log("onConnect called"));
    const spy2 = Sinon.spy(sequelize => server.log("onConnect called"));

    await server.register({
      plugin: require("../lib"),
      options: {
        instances: [
          {
            name: "blog",
            models: ["./test/models/blog/*.js"],
            sequelize: new Sequelize("blog", user, password, {
              host,
              port,
              dialect: "mysql",
              operatorsAliases: false
            }),
            sync: true,
            forceSync: true,
            onConnect: spy
          },
          {
            name: "shop",
            models: ["./test/models/shop/**/*.js"],
            sequelize: new Sequelize("shop", user, password, {
              host,
              port,
              dialect: "mysql",
              operatorsAliases: false
            }),
            sync: true,
            forceSync: true,
            onConnect: spy2
          }
        ]
      }
    });

    expect(server.plugins["@fredguile/hapi-sequelize"]).to.exist();

    expect(
      server.plugins["@fredguile/hapi-sequelize"]["shop"].sequelize
    ).to.be.an.instanceOf(Sequelize);

    expect(
      server.plugins["@fredguile/hapi-sequelize"]["blog"].sequelize
    ).to.be.an.instanceOf(Sequelize);

    expect(spy.getCall(0).args[0]).to.be.an.instanceOf(Sequelize);
    expect(spy2.getCall(0).args[0]).to.be.an.instanceOf(Sequelize);

    const tables = await server.plugins["@fredguile/hapi-sequelize"][
      "blog"
    ].sequelize.query("show tables", { type: Sequelize.QueryTypes.SELECT });

    expect(tables.length).to.equal(3);

    const tables2 = await server.plugins["@fredguile/hapi-sequelize"][
      "shop"
    ].sequelize.query("show tables", { type: Sequelize.QueryTypes.SELECT });

    expect(tables2.length).to.equal(5);
  });

  test(
    "plugin throws error when no models are found",
    { parallel: true },
    async () => {
      const server = new Hapi.Server();

      const sequelize = new Sequelize("shop", user, password, {
        host,
        port,
        dialect: "mysql",
        operatorsAliases: false
      });

      try {
        await server.register({
          plugin: require("../lib"),
          options: {
            instances: {
              name: "foo",
              models: ["./foo/**/*.js"],
              sequelize,
              sync: true,
              forceSync: true
            }
          }
        });
      } catch (err) {
        expect(err).to.exist();
      }
    }
  );
});
