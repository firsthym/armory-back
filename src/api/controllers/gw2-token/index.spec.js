import * as testData from 'test/testData/db';

describe('gw2 token controller', () => {
  let controller;
  let models;
  let fetch;
  let readTokenInfoWithAccount;
  let validate;
  let createValidator;

  const mockConfig = {
    fetch: {
      host: 'host',
      port: 'port',
    },
  };

  const user = testData.user();

  const apiToken = testData.apiToken({
    token: 'cool_token',
    primary: true,
  });

  const apiTokenTwo = testData.apiToken({
    id: 2,
    token: 'another_token',
    accountName: 'asdasd.4444',
    accountId: 'azcxxc',
  });

  beforeEach(async () => {
    models = await setupTestDb();

    fetch = sinon.stub();
    readTokenInfoWithAccount = sinon.stub();
    validate = sinon.stub();
    createValidator = () => ({ validate });
    createValidator.addResource = sinon.spy();

    const controllerFactory = proxyquire('api/controllers/gw2-token', {
      'lib/services/fetch': { fetch },
      config: mockConfig,
      'lib/gw2': {
        readTokenInfoWithAccount,
      },
    });

    controller = controllerFactory(models, createValidator);
  });

  const seedDb = async function (email, addTokens = true) {
    await models.User.create({ ...user, email });

    if (!addTokens) {
      return;
    }

    await models.Gw2ApiToken.create(apiTokenTwo);
    await models.Gw2ApiToken.create(apiToken);
  };

  describe('list', () => {
    it('should list tokens in db', async () => {
      await seedDb('email@email.com');

      const tokens = await controller.list('email@email.com');

      expect(2).to.equal(tokens.length);

      const [token1, token2] = tokens;

      expect(apiToken.token).to.equal(token1.token);
      expect(apiToken.accountName).to.equal(token1.accountName);
      expect(apiToken.world).to.equal(token1.world);
      expect(apiToken.primary).to.equal(token1.primary);

      expect(apiTokenTwo.token).to.equal(token2.token);
      expect(apiTokenTwo.accountName).to.equal(token2.accountName);
      expect(apiTokenTwo.world).to.equal(token2.world);
      expect(apiTokenTwo.primary).to.equal(token2.primary);
    });
  });

  describe('adding', () => {
    it('should add users resource in update-gw2-token mode to validator', () => {
      expect(createValidator.addResource).to.have.been.calledWith({
        name: 'gw2-token',
        mode: 'add',
        rules: {
          token: ['valid-gw2-token', 'no-white-space'],
        },
      });
    });

    it('should reject promise if validation fails', async () => {
      validate.returns(Promise.reject('failed'));

      try {
        await controller.add('1234', 'token');
      } catch (e) {
        expect(e).to.equal('failed');
        expect(validate).to.have.been.calledWith({
          token: 'token',
        });
      }
    });

    it('should add token to db as not primary', async () => {
      validate.returns(Promise.resolve());

      readTokenInfoWithAccount.returns(Promise.resolve({
        accountName: 'nameee',
        accountId: 'eeee',
        world: 1122,
        info: ['cool', 'yeah!'],
      }));

      fetch.returns(Promise.resolve());

      await seedDb('cool@email.com');

      const result = await controller.add('cool@email.com', 'token');

      expect(result.primary).to.equal(false);
    });

    it('should add token to db as primary if first token', async () => {
      validate.returns(Promise.resolve());

      readTokenInfoWithAccount.returns(Promise.resolve({
        accountName: 'nameee',
        accountId: 'eeee',
        world: 1122,
        info: ['cool', 'yeah!'],
      }));

      await models.User.create({
        email: 'cool@email.com',
        passwordHash: 'lolz',
        alias: 'swagn',
      });

      const result = await controller.add('cool@email.com', 'token');

      expect(result).to.include({
        token: 'token',
        primary: true,
        permissions: 'cool,yeah!',
        accountName: 'nameee',
      });

      expect(fetch).to.have.been.calledWith({
        token: result.token,
        permissions: result.permissions,
        id: result.id,
      });
    });
  });

  describe('select primary', () => {
    it('should set all tokens primary to false except for target', async () => {
      await seedDb('email@email.com');

      await controller.selectPrimary('email@email.com', 'another_token');

      const tokens = await models.Gw2ApiToken.findAll();
      const primaryToken = tokens.filter(({ token }) => token === 'another_token')[0];

      const otherTokens = tokens.filter(({ token }) => token !== 'another_token');

      expect(primaryToken.primary).to.equal(true);

      otherTokens.forEach((token) => expect(token.primary).to.equal(false));
    });
  });

  describe('removing', () => {
    it('should remove token from db', async () => {
      validate.returns(Promise.resolve());
      readTokenInfoWithAccount.returns(Promise.resolve({
        accountName: 'nameee',
        accountId: 'eeee',
        world: 1122,
        info: ['cool', 'yeah!'],
      }));

      fetch.returns(Promise.resolve());

      await models.User.create({
        email: 'cool@email.com',
        passwordHash: 'lolz',
        alias: 'swagn',
      });


      const result = await controller.add('cool@email.com', 'token');

      expect(result.token).to.equal('token');
      expect(result.accountName).to.equal('nameee');

      await controller.remove('cool@email.com', 'token');

      const tokens = await models.Gw2ApiToken.findOne({
        where: {
          token: 'token',
        },
      });

      expect(tokens).to.equal(null);
    });
  });
});
