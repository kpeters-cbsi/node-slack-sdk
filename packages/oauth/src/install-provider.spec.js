require('mocha');
const { assert } = require('chai');

const url = require('url');
const rewiremock = require('rewiremock/node');
const sinon = require('sinon');
const { ErrorCode } = require('./errors');
const { LogLevel } = require('./logger');

// Stub WebClient api calls that the OAuth package makes
// expose clientOptions passed in to WebClient as global so we can assert on its contents
let webClientOptions;
rewiremock(() => require('@slack/web-api')).with({
  WebClient: class {
    constructor(token, options) {
      this.token = token;
      this.options = options;
      webClientOptions = options;
    };
    auth = {
      test: sinon.fake.resolves({ bot_id: '' }),
    };
    oauth = {
      access: sinon.fake.resolves({
        team_id: 'fake-v1-team-id',
        team_name: 'fake-team-name',
        access_token: 'token',
        bot: {
          bot_access_token: 'botAccessToken',
          bot_user_id: 'botUserId',
        },
        scope: 'bot',
        appId: 'fakeAppId',
      }),
      v2: {
        access: (options) => mockedV2AccessResp(options),
      }
    }
  },
});

async function mockedV2AccessResp(options) {
  const mockedResp = {
    team: { id: 'fake-v2-team-id', name: 'fake-team-name' },
    access_token: 'botToken',
    bot_user_id: 'botUserId',
    scope: 'chat:write,chat:read',
    appId: 'fakeAppId',
    enterprise: null,
    token_type: 'bot',
  };

  // Token rotation payload has different shape than "normal" v2 access response
  // See OAuthV2Response vs. OAuthV2TokenRefreshResponse for details
  if (options.grant_type === 'refresh_token') {
    mockedResp.refresh_token = 'newRefreshToken';
    mockedResp.expires_in = 43200; // 12 hours

    if (options.refresh_token.startsWith('user')) {
      mockedResp.token_type = 'user';
    }
  } else {
    mockedResp.authed_user = { id: 'userId', access_token: 'userAccessToken', };
  }

  return mockedResp;
}

rewiremock.enable();
const { InstallProvider } = require('./index');
rewiremock.disable();

const clientSecret = 'MY_SECRET';
const clientId = 'MY_ID';
const stateSecret = 'stateSecret';

// Memory database
const devDB = {};

// MemoryInstallation Store for testing
const installationStore = {
  storeInstallation: (installation) => {
    // db write
    devDB[installation.team.id] = installation;
    return new Promise((resolve) => {
      resolve();
    });
  },
  fetchInstallation: (installQuery) => {
    // db read
    const item = devDB[installQuery.teamId];
    return new Promise((resolve) => {
      resolve(item);
    });
  },
  deleteInstallation: (installQuery) => {
    // db delete
    delete devDB[installQuery.teamId];
    return new Promise((resolve) => {
      resolve();
    });
  }
}

const storedInstallation = {
  team: {
    id: 'test-team-id',
    name: 'team-name',
  },
  enterprise: {
    id: 'test-enterprise-id',
    name: 'ent-name',
  },
  bot: {
    token: 'botToken',
    scopes: ['chat:write'],
    id: 'botId',
    userId: 'botUserId',
  },
  user: {
    token: 'userToken',
    id: 'userId',
  },
  incomingWebhook: {
    url: 'example.com',
    channel: 'someChannel',
    channelId: 'someChannelID',
    configurationUrl: 'someConfigURL',
  },
  appId: 'fakeAppId',
  tokenType: 'tokenType',
  isEnterpriseInstall: false,
}

// TODO: valid tests with org-wide installations
const storedOrgInstallation = {
  team: null,
  enterprise: {
    id: 'test-enterprise-id',
    name: 'ent-name',
  },
  bot: {
    token: 'botToken',
    scopes: ['chat:write'],
    id: 'botId',
    userId: 'botUserId',
  },
  user: {
    token: 'userToken',
    id: 'userId',
  },
  incomingWebhook: {
    url: 'example.com',
    channel: 'someChannel',
    channelId: 'someChannelID',
    configurationUrl: 'someConfigURL',
  },
  appId: undefined,
  tokenType: 'tokenType',
  isEnterpriseInstall: true,
}

// store our fake installation Object to the memory database.
devDB[storedInstallation.team.id] = storedInstallation;
devDB[storedOrgInstallation.enterprise.id] = storedOrgInstallation;

describe('InstallProvider', async () => {
  const noopLogger = {
    debug(..._msg) { /* noop */ },
    info(..._msg) { /* noop */ },
    warn(..._msg) { /* noop */ },
    error(..._msg) { /* noop */ },
    setLevel(_level) { /* noop */ },
    getLevel() { return LogLevel.DEBUG; },
    setName(_name) { /* noop */ },
  };

  describe('constructor()', async () => {
    it('should build a default installer given a clientID, client secret and stateSecret', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, logger: noopLogger, });
      assert.instanceOf(installer, InstallProvider);
      assert.equal(installer.authVersion, 'v2');
    });

    it('should build a default installer given a clientID, client secret, stateSecret and clientOptions', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, logger: noopLogger, clientOptions: fooClientOptions });
      assert.instanceOf(installer, InstallProvider);
      assert.equal(installer.authVersion, 'v2');
      assert.equal(installer.clientOptions.foo, 'bar');
    });

    it('should build a default installer given a clientID, client secret and state store', async () => {
      // stateStore for testing
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }

      const installer = new InstallProvider({ clientId, clientSecret, stateStore: fakeStateStore, logger: noopLogger, });
      assert.instanceOf(installer, InstallProvider);
    });

    it('should build a default installer given a clientID, client secret, stateSecrect and installationStore', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, logger: noopLogger, });
      assert.instanceOf(installer, InstallProvider);
    });

    it('should build a default installer given a clientID, client secret, stateSecrect and authVersion v2', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, authVersion: 'v2', logger: noopLogger, });
      assert.instanceOf(installer, InstallProvider);
      assert.equal(installer.authVersion, 'v2');
    });

    it('should build a default installer given a clientID, client secret, stateSecrect and authVersion v1', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, authVersion: 'v1', logger: noopLogger, });
      assert.instanceOf(installer, InstallProvider);
      assert.equal(installer.authVersion, 'v1');
    });

    it('should throw an error if missing a clientSecret', async () => {
      try {
        new InstallProvider({ clientId, stateSecret, logger: noopLogger, });
      } catch (error) {
        assert.equal(error.code, ErrorCode.InstallerInitializationError);
        assert.equal(error.message, 'You must provide a valid clientId and clientSecret');
      }
    });

    it('should throw an error if missing a clientID', async () => {
      try {
        new InstallProvider({ clientSecret, stateSecret, logger: noopLogger, });
      } catch (error) {
        assert.equal(error.code, ErrorCode.InstallerInitializationError);
        assert.equal(error.message, 'You must provide a valid clientId and clientSecret');
      }
    });

    it('should throw an error if missing a stateSecret when using default state store', async () => {
      try {
        new InstallProvider({ clientId, clientSecret, logger: noopLogger, });
      } catch (error) {
        assert.equal(error.code, ErrorCode.InstallerInitializationError);
        assert.equal(error.message, 'To use the built-in state store you must provide a State Secret');
      }
    });
  });

  describe('installer.handleInstallPath', async () => {
    it('should fail if installUrlOptions are not given', async () => {
      const installer = new InstallProvider({
        clientId,
        clientSecret,
        installUrlOptions: undefined,
        stateStore: {
          generateStateParam: sinon.fake.resolves('fakeState'),
          verifyStateParam: sinon.fake.resolves({})
        },
        logger: noopLogger,
      });
      const req = {};
      const headers = {};
      const res = { setHeader(n, v) { headers[n] = v; }, writeHead: () => {}, end: () => {}, };
      try {
        await installer.handleInstallPath(req, res);
        assert.fail('Exception should be thrown')
      } catch (e) {
        assert.equal(e.code, ErrorCode.GenerateInstallUrlError);
      }
    });

    const installUrlOptions = {
      scopes: ['channels:read'],
      metadata: 'some_metadata',
      teamId: 'T12345',
      redirectUri: 'https://mysite.com/slack/redirect',
      userScopes: ['chat:write:user'],
      metadata: 'foo',
    };

    it('should redirect installers to valid authorize URL with state param', async () => {
      const installer = new InstallProvider({
        clientId,
        clientSecret,
        installUrlOptions,
        directInstall: true,
        stateStore: {
          generateStateParam: sinon.fake.resolves('fakeState'),
          verifyStateParam: sinon.fake.resolves({})
        },
        logger: noopLogger,
      });
      const req = {};
      const headers = {};
      const res = { setHeader(n, v) { headers[n] = v; }, writeHead: () => {}, end: () => {}, };
      await installer.handleInstallPath(req, res);

      assert.equal(headers['Location'], 'https://slack.com/oauth/v2/authorize?scope=channels%3Aread&state=fakeState&client_id=MY_ID&redirect_uri=https%3A%2F%2Fmysite.com%2Fslack%2Fredirect&team=T12345&user_scope=chat%3Awrite%3Auser');
      assert.equal(headers['Set-Cookie'], 'slack-app-oauth-state=fakeState; Secure; HttpOnly; Path=/; Max-Age=600');
    });
    it('should redirect installers with data set by InstallPathOptions.beforeRedirection()', async () => {
      const installer = new InstallProvider({
        clientId,
        clientSecret,
        installUrlOptions,
        directInstall: true,
        stateStore: {
          generateStateParam: sinon.fake.resolves('fakeState'),
          verifyStateParam: sinon.fake.resolves({})
        },
        logger: noopLogger,
      });
      const req = {};
      const headers = {};
      const res = {
        setHeader(n, v) {
          if (headers[n] === undefined) headers[n] = [];
          headers[n].push(v);
        },
        writeHead: () => {}, end: () => {},
      };
      const installPathOptions = {
        beforeRedirection: async (_, res) => {
          res.setHeader('Set-Cookie', 'additional-cookie=external-service-user-id; Secure; HttpOnly;');
          return true;
        },
      };
      await installer.handleInstallPath(req, res, installPathOptions);

      assert.equal(headers['Location'], 'https://slack.com/oauth/v2/authorize?scope=channels%3Aread&state=fakeState&client_id=MY_ID&redirect_uri=https%3A%2F%2Fmysite.com%2Fslack%2Fredirect&team=T12345&user_scope=chat%3Awrite%3Auser');
      assert.equal(headers['Set-Cookie'][0], 'additional-cookie=external-service-user-id; Secure; HttpOnly;');
      assert.equal(headers['Set-Cookie'][1], 'slack-app-oauth-state=fakeState; Secure; HttpOnly; Path=/; Max-Age=600');
    });
  });

  describe('installer.generateInstallUrl', async () => {
    it('should return a generated v2 url', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateStore: fakeStateStore, logger: noopLogger, });
      const scopes = ['channels:read'];
      const teamId = '1234Team';
      const redirectUri = 'https://mysite.com/slack/redirect';
      const userScopes = ['chat:write:user'];
      const stateVerification = true;
      const installUrlOptions = {
        scopes,
        metadata: 'some_metadata',
        teamId,
        redirectUri,
        userScopes,
      };
      try {
        const generatedUrl = await installer.generateInstallUrl(installUrlOptions, stateVerification)
        assert.exists(generatedUrl);
        assert.equal(fakeStateStore.generateStateParam.callCount, 1);
        assert.equal(fakeStateStore.verifyStateParam.callCount, 0);
        assert.equal(fakeStateStore.generateStateParam.calledWith(installUrlOptions), true);

        const parsedUrl = url.parse(generatedUrl, true);
        assert.equal(parsedUrl.query.state, 'fakeState');
        assert.equal(parsedUrl.pathname, '/oauth/v2/authorize');
        assert.equal(scopes.join(','), parsedUrl.query.scope);
        assert.equal(redirectUri, parsedUrl.query.redirect_uri);
        assert.equal(teamId, parsedUrl.query.team);
        assert.equal(userScopes.join(','), parsedUrl.query.user_scope);
      } catch (error) {
        assert.fail(error.message);
      }
    });
    it('should not call generate state param when state validation is false', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }
      const authorizationUrl = 'https://dev.slack.com/oauth/v2/authorize';
      const installer = new InstallProvider({ clientId, clientSecret, stateStore: fakeStateStore, authorizationUrl, logger: noopLogger, });
      const scopes = ['channels:read'];
      const teamId = '1234Team';
      const redirectUri = 'https://mysite.com/slack/redirect';
      const userScopes = ['chat:write:user']
      const stateVerification = false;
      const installUrlOptions = {
        scopes,
        metadata: 'some_metadata',
        teamId,
        redirectUri,
        userScopes,
      };
      try {
        const generatedUrl = await installer.generateInstallUrl(installUrlOptions, stateVerification)
        assert.exists(generatedUrl);
        assert.equal(fakeStateStore.generateStateParam.callCount, 0);
        assert.equal(fakeStateStore.verifyStateParam.callCount, 0);
      } catch (error) {
        assert.fail(error.message);
      }
    });
    it('should return a generated url when passed a custom authorizationUrl', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }
      const authorizationUrl = 'https://dev.slack.com/oauth/v2/authorize';
      const installer = new InstallProvider({ clientId, clientSecret, stateStore: fakeStateStore, authorizationUrl, logger: noopLogger, });
      const scopes = ['channels:read'];
      const teamId = '1234Team';
      const redirectUri = 'https://mysite.com/slack/redirect';
      const userScopes = ['chat:write:user']
      const installUrlOptions = {
        scopes,
        metadata: 'some_metadata',
        teamId,
        redirectUri,
        userScopes,
      };
      try {
        const generatedUrl = await installer.generateInstallUrl(installUrlOptions)
        assert.exists(generatedUrl);
        assert.equal(fakeStateStore.generateStateParam.callCount, 1);
        assert.equal(fakeStateStore.verifyStateParam.callCount, 0);
        assert.equal(fakeStateStore.generateStateParam.calledWith(installUrlOptions), true);

        const parsedUrl = url.parse(generatedUrl, true);
        assert.equal(parsedUrl.query.state, 'fakeState');
        assert.equal(parsedUrl.pathname, '/oauth/v2/authorize');
        assert.equal(parsedUrl.host, 'dev.slack.com')
        assert.equal(scopes.join(','), parsedUrl.query.scope);
        assert.equal(redirectUri, parsedUrl.query.redirect_uri);
        assert.equal(teamId, parsedUrl.query.team);
        assert.equal(userScopes.join(','), parsedUrl.query.user_scope);
      } catch (error) {
        assert.fail(error.message);
      }
    });

    it('should return a generated v1 url', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }
      const installer = new InstallProvider({ clientId, clientSecret, 'stateStore': fakeStateStore, authVersion: 'v1', logger: noopLogger, });
      const scopes = ['bot'];
      const teamId = '1234Team';
      const redirectUri = 'https://mysite.com/slack/redirect';
      const stateVerification = true;
      const installUrlOptions = {
        scopes,
        metadata: 'some_metadata',
        teamId,
        redirectUri,
      };
      try {
        const generatedUrl = await installer.generateInstallUrl(installUrlOptions, stateVerification)
        assert.exists(generatedUrl);
        const parsedUrl = url.parse(generatedUrl, true);
        assert.equal(fakeStateStore.generateStateParam.callCount, 1);
        assert.equal(fakeStateStore.verifyStateParam.callCount, 0);
        assert.equal(fakeStateStore.generateStateParam.calledWith(installUrlOptions), true);
        assert.equal(parsedUrl.pathname, '/oauth/authorize');
        assert.equal(parsedUrl.query.state, 'fakeState');
        assert.equal(scopes.join(','), parsedUrl.query.scope);
        assert.equal(redirectUri, parsedUrl.query.redirect_uri);
        assert.equal(teamId, parsedUrl.query.team);
      } catch (error) {
        assert.fail(error.message);
      }
    });

    it('should fail if missing scopes', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, logger: noopLogger, });
      try {
        const generatedUrl = await installer.generateInstallUrl({})
        assert.exists(generatedUrl);
      } catch (error) {
        assert.equal(error.message, 'You must provide a scope parameter when calling generateInstallUrl');
        assert.equal(error.code, ErrorCode.GenerateInstallUrlError);
      }
    });
  });

  describe('installer.authorize', async () => {
    it('should fail if database does not have an entry for authorize query', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore,logger: noopLogger, });
      try {
        const authResult = await installer.authorize({ teamId: 'non_existing_team_id' });
        assert.fail('Should have failed');
      } catch (error) {
        assert.equal(error.code, ErrorCode.AuthorizationError);
        assert.equal(error.message, 'Failed fetching data from the Installation Store (source: {"teamId":"non_existing_team_id"})');
      }
    });

    it('should successfully return the Installation Object from the database', async () => {
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore,logger: noopLogger, });
      const fakeAuthResult = {
        userToken: 'userToken',
        botToken: 'botToken',
        botId: 'botId',
        botUserId: 'botUserId'
      };

      try {
        const authResult = await installer.authorize({ teamId: 'test-team-id' });
        assert.equal(authResult.userToken, fakeAuthResult.userToken);
        assert.equal(authResult.botToken, fakeAuthResult.botToken);
        assert.equal(authResult.botId, fakeAuthResult.botId);
        assert.equal(authResult.botUserId, fakeAuthResult.botUserId);
      } catch (error) {
        assert.fail(error.message);
      }
    });
  });

  describe('installer.handleCallback', async () => {
    let fakeStateStore = undefined;
    beforeEach(() => {
      fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      }
    });

    it('should call the failure callback with a valid installOptions due to missing code query parameter on the URL', async () => {
      const req = { headers: { host: 'example.com'},  url: 'http://example.com' };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const callbackOptions = {
        success: async (installation, installOptions, req, res) => {
          res.send('successful!');
          assert.fail('should have failed');
        },
        failure: async (error, installOptions, req, res) => {
          // To detect future regressions, we verify if there is a valid installOptions here
          // Refer to https://github.com/slackapi/node-slack-sdk/pull/1410 for the context
          assert.isDefined(installOptions);
          assert.equal(error.code, ErrorCode.MissingCodeError);
          res.send('failure');
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.isTrue(sent);
    });
    it('should call the failure callback due to missing state query parameter on the URL', async () => {
      const req = {
        headers: {
          host: 'example.com',
          cookie: 'slack-app-oauth-state=fakeState',
        },
        url: 'http://example.com?code=1234',
      };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const callbackOptions = {
        success: async (installation, installOptions, req, res) => {
          res.send('successful!');
          assert.fail('should have failed');
        },
        failure: async (error, installOptions, req, res) => {
          assert.isDefined(installOptions);
          assert.equal(error.code, ErrorCode.MissingStateError)
          res.send('failure');
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.isTrue(sent);
    });

    it('should call the success callback when state query param is missing but stateVerification disabled', async () => {
      const req = { headers: { host: 'example.com'}, url: 'http://example.com?code=1234' };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, stateVerification: false, installationStore, logger: noopLogger, });
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
    });

    it('should call the failure callback if an access_denied error query parameter was returned on the URL', async () => {
      const req = { headers: { host: 'example.com'}, url: 'http://example.com?error=access_denied' };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const callbackOptions = {
        success: async (installation, installOptions, req, res) => {
          res.send('successful!');
          assert.fail('should have failed');
        },
        failure: async (error, installOptions, req, res) => {
          assert.isDefined(installOptions);
          assert.equal(error.code, ErrorCode.AuthorizationError)
          res.send('failure');
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.isTrue(sent);
    });

    it('should call the success callback for a v2 url', async () => {
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, installationStore, stateStore: fakeStateStore, logger: noopLogger, });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
      assert.equal(fakeStateStore.verifyStateParam.callCount, 1);
    });

    it('should call the success callback for a v2 url and client options passed into InstallProvider should be propagated to the underlying @web-api WebClient', async () => {
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, installationStore, stateStore: fakeStateStore, logger: noopLogger, clientOptions: fooClientOptions });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
      assert.equal(fakeStateStore.verifyStateParam.callCount, 1);
      assert.equal(webClientOptions.foo, fooClientOptions.foo);
    });

    it('should call the success callback for a v1 url', async () => {
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateStore: fakeStateStore, authVersion: 'v1', logger: noopLogger, });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
      assert.equal(fakeStateStore.verifyStateParam.callCount, 1);
    });

    it('should call the success callback for a v1 url and client options passed into InstallProvider should be propagated to the underlying @web-api WebClient', async () => {
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateStore: fakeStateStore, authVersion: 'v1', logger: noopLogger, clientOptions: fooClientOptions });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
      assert.equal(fakeStateStore.verifyStateParam.callCount, 1);
      assert.equal(webClientOptions.foo, fooClientOptions.foo);
    });

    it('should not verify state when stateVerification is false', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      };
      let sent = false;
      const res = { send: () => { sent = true; } };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, stateVerification: false, installationStore, stateStore: fakeStateStore, logger: noopLogger, });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          // cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
      assert.equal(fakeStateStore.verifyStateParam.callCount, 0);
    });

    it('should terminate the processing when callbackOptions.beforeInstallation() returns false', async () => {
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      let endCalled = false;
      const res = {
        writeHead: (status) => { assert.equal(status, 400); },
        end: () => { endCalled = true; },
      };
      const callbackOptions = {
        beforeInstallation: async (installOptions, req, res) => {
          // if the installation is not acceptable
          res.writeHead(400);
          res.end('error page content');
          return false;
        },
        afterInstallation: async (installation, installOptions, req, res) => {
          assert.fail('afterInstallation should not be called');
        },
        successAsync: async (installation, installOptions, req, res) => {
          assert.fail('successAsync should not be called');
        },
        failureAsync: async (error, installOptions, req, res) => {
          assert.fail(`failureAsync should not be called ${error}`);
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateVerification: false, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.isTrue(endCalled);
    });
    it('should terminate the processing when callbackOptions.afterInstallation() returns false', async () => {
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      let endCalled = false;
      const res = {
        writeHead: (status) => { assert.equal(status, 400); },
        end: () => { endCalled = true; },
      };
      const callbackOptions = {
        beforeInstallation: async (installOptions, req, res) => {
          return true;
        },
        afterInstallation: async (installation, installOptions, req, res) => {
          // revoke the tokens and display error to the installing user
          res.writeHead(400);
          res.end('error page content');
          return false;
        },
        successAsync: async (installation, installOptions, req, res) => {
          assert.fail('successAsync should not be called');
        },
        failureAsync: async (error, installOptions, req, res) => {
          assert.fail(`failureAsync should not be called ${error}`);
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateVerification: false, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.isTrue(endCalled);
    });
    it('should execute both success and succesAsync', async () => {
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      const res = {
        writeHead: (status) => { assert.equal(status, 400); },
        end: () => { },
      };
      let callCount = 0;
      const callbackOptions = {
        success: () => {
          callCount += 1;
        },
        successAsync: async () => {
          callCount += 1;
        },
        failureAsync: async (error) => {
          assert.fail(`failureAsync should not be called ${error}`);
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateVerification: false, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.equal(callCount, 2);
    });
    it('should execute both failure and failureAsync', async () => {
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          // cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      const res = {
        writeHead: (status) => { assert.equal(status, 400); },
        end: () => { },
      };
      let callCount = 0;
      const callbackOptions = {
        failure: () => {
          callCount += 1;
        },
        failureAsync: async () => {
          callCount += 1;
        },
        success: async () => {
          assert.fail('success should not be called in this test');
        },
      }
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, logger: noopLogger, });
      await installer.handleCallback(req, res, callbackOptions);

      assert.equal(callCount, 2);
    });

    it('should fail if the state value is not in cookies', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateStore: fakeStateStore, authVersion: 'v2', logger: noopLogger, clientOptions: fooClientOptions });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          // cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, failureExpectedCallbackOptions);
      assert.isTrue(sent);
    });
    it('should fail if there is a different state value in cookies', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({ clientId, clientSecret, stateSecret, installationStore, stateStore: fakeStateStore, authVersion: 'v2', logger: noopLogger, clientOptions: fooClientOptions });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=something-different`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, failureExpectedCallbackOptions);
      assert.isTrue(sent);
    });
    it('should not fail if no state cookie returned and legacyStateVerification is enabled', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({
        clientId,
        clientSecret,
        stateSecret,
        installationStore,
        logger: noopLogger,
        stateStore: fakeStateStore,
        clientOptions: fooClientOptions,
        legacyStateVerification: true, // this is the key configuration in this test
      });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          // cookie: `slack-app-oauth-state=${fakeState}`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
    });
    it('should not fail if a different state cookie returned and legacyStateVerification is enabled', async () => {
      const fakeStateStore = {
        generateStateParam: sinon.fake.resolves('fakeState'),
        verifyStateParam: sinon.fake.resolves({})
      };
      let sent = false;
      const res = {
        send: () => { sent = true; },
        setHeader: () => {},
      };
      const installer = new InstallProvider({
        clientId,
        clientSecret,
        stateSecret,
        installationStore,
        logger: noopLogger,
        stateStore: fakeStateStore,
        clientOptions: fooClientOptions,
        legacyStateVerification: true, // this is the key configuration in this test
      });
      const fakeState = 'fakeState';
      const fakeCode = 'fakeCode';
      const req = {
        headers: {
          host: 'example.com',
          cookie: `slack-app-oauth-state=something-different`,
        },
        url: `http://example.com?state=${fakeState}&code=${fakeCode}`,
      };
      await installer.handleCallback(req, res, successExpectedCallbackOptions);
      assert.isTrue(sent);
    });
  });
});

const successExpectedCallbackOptions = {
  success: async (_installation, _options, _req, res) => {
    res.send('success as expected!');
  },
  failure: async (error, _options, _req, _res) => {
    assert.fail(error.message);
  },
};

const failureExpectedCallbackOptions = {
  success: async (_installation, _ptions, _req, _res) => {
    assert.fail('should fail');
  },
  failure: async (_error, _options, _req, res) => {
    res.send('failed as expected!');
  },
};

const fooClientOptions = { foo: 'bar' };
