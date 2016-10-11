const Sequelize = require('sequelize');
const Models = require('../src/models');

global.chai = require('chai');
global.sinon = require('sinon');
global.expect = require('chai').expect;
global.AssertionError = require('chai').AssertionError;

const sinonChai = require('sinon-chai');

global.chai.use(sinonChai);

global.setupDb = ({ seedDb, token } = {}) => {
  const models = new Models(global.testDb());

  return models.sequelize.sync({
    force: true,
  })
  .then(() => {
    if (seedDb) {
      return global.seedData(models, { tokenOverride: token });
    }

    return undefined;
  })
  .then(() => models);
};

global.testDb = () => {
  return new Sequelize('database', 'username', 'password', {
    dialect: 'sqlite',
    logging: false,
  });
};

global.seedData = (models, { tokenOverride } = {}) => {
  let userId;

  return models
    .User
    .create({
      email: 'cool@email.com',
      passwordHash: 'realhashseriously',
      alias: 'huedwell',
    })
    .then((user) => {
      userId = user.id;

      return models
        .Gw2ApiToken
        .create({
          token: tokenOverride ||
            '938C506D-F838-F447-8B43-4EBF34706E0445B2B503-977D-452F-A97B-A65BB32D6F15',
          accountName: 'cool.4321',
          accountId: 'haha_id',
          permissions: 'cool,permissions',
          world: 1234,
          UserId: userId,
        });
    })
    .then((token) => {
      return models
        .Gw2Character
        .create({
          name: 'character',
          race: 'race',
          gender: 'gender',
          profession: 'profession',
          level: 69,
          created: '01/01/90',
          age: 20,
          deaths: 2,
          Gw2ApiTokenToken: token.token,
        });
    })
    .then(() => {
      return models
        .Gw2ApiToken
        .create({
          token: '25E6FAC3-1912-7E47-9420-2965C5E4D63DEAA54B0F-092E-48A8-A2AE-9E197DF4BC8B',
          accountName: 'cool.4322',
          accountId: 'haha_iddd',
          permissions: 'cool,permissions',
          world: 1234,
          UserId: userId,
        });
    });
};