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
  test("plugin works", { parallel: true }, async () => {
    const server = new Hapi.Server();

    const sequelize = new Sequelize("shop", user, password, {
      host,
      port,
      dialect: "mysql",
      operatorsAliases: false
    });

    const spy = Sinon.spy(sequelize => server.log("onConnect called"));

    await server.register({
      plugin: require("../lib"),
      options: [
        {
          name: "shop",
          models: ["./test/models/**/*.js"],
          sequelize,
          sync: true,
          forceSync: true,
          onConnect: spy
        }
      ]
    });

    expect(server.plugins["@fredguile/hapi-sequelize"]).to.exist();

    expect(
      server.plugins["@fredguile/hapi-sequelize"]["shop"].sequelize
    ).to.be.an.instanceOf(Sequelize);

    expect(spy.getCall(0).args[0]).to.be.an.instanceOf(Sequelize);

    const tables = await server.plugins["@fredguile/hapi-sequelize"][
      "shop"
    ].sequelize.query("show tables", { type: Sequelize.QueryTypes.SELECT });

    expect(tables.length).to.equal(6);
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
          options: [
            {
              name: "foo",
              models: ["./foo/**/*.js"],
              sequelize,
              sync: true,
              forceSync: true
            }
          ]
        });
      } catch (err) {
        expect(err).to.exist();
      }
    }
  );
});
