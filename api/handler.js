'use strict';

// AWS SDK
const region = 'ap-northeast-1';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secretsManager = new SecretsManagerClient({ region });

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// Environment variables
const {
  users_table: usersTable,
  albums_table: albumsTable,
} = process.env;

module.exports.authorizer = async event => {
  console.log('[event]', event);

  const [ userId, accessToken ] = event.headers.authorization.split(':');

  const { Item: user } = await db.send(new GetCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: userId,
    },
  }));
  console.log('[user]', user);

  return {
    isAuthorized: accessToken === user?.twitterAccessToken,
    context: {
      userId,
      accessToken,
    },
  }
};

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Go Serverless v3.0! Your function executed successfully!",
        input: event,
      },
      null,
      2
    ),
  };
};

module.exports.auth = async event => {
  console.log('[event]', event);

  const { code, verifier, redirectUrl } = JSON.parse(event.body);

  // Client Secret
  const secrets = await secretsManager.send(new GetSecretValueCommand({
    SecretId: 'TweetAlbum',
  }));
  const {
    TwitterClientId: clientId,
    TwitterClientSecret: clientSecret,
  } = JSON.parse(secrets.SecretString);

  // Access Token
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUrl,
      code_verifier: verifier,
    }),
  });

  const token = await response.json();
  const { access_token: accessToken, refresh_token: refreshToken } = token;

  // Me
  const meResponse = await fetch('https://api.twitter.com/2/users/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const { data: me } = await meResponse.json();
  console.log('[me]', me);

  // Save
  await db.send(new PutCommand({
    TableName: usersTable,
    Item: {
      twitterUserId: me.id,
      twitterAccessToken: accessToken,
      twitterRefreshToken: refreshToken,
    },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ ...token, ...me }),
  };
};

module.exports.saveAlbum = async (event) => {
  console.log('[event]', event);
  console.log('[request body]', event.body);

  const { keyword } = JSON.parse(event.body);
  const { userId } = event.requestContext.authorizer.lambda;

  const id = Date.now();

  await db.send(new PutCommand({
    TableName: albumsTable,
    Item: {
      twitterUserId: userId,
      id,
      keyword,
    },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({
      id,
    }),
  };
};
