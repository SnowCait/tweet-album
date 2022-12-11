'use strict';

// AWS SDK
const region = 'ap-northeast-1';

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secretsManager = new SecretsManagerClient({ region });

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
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

  const body = JSON.stringify({
    id,
  });
  console.log('[response body]', body);

  return { statusCode: 200, body };
};

module.exports.listAlbums = async (event) => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { userId } = event.pathParameters;

  const {
    Items: albums,
    Count: count,
    ScannedCount: scannedCount
  } = await db.send(new QueryCommand({
    TableName: albumsTable,
    KeyConditionExpression: 'twitterUserId = :twitterUserId',
    ExpressionAttributeValues: {
      ':twitterUserId': userId,
    },
    ScanIndexForward: false,
    Limit: 50,
  }));
  console.log('[albums]', count, scannedCount, albums);

  const body = JSON.stringify({
    albums,
  });
  console.log('[response body]', body);

  return { statusCode: 200, body };
};

module.exports.updateAlbums = async (event) => {
  console.log('[event]', event);

  const { Items: users } = await db.send(new ScanCommand({
    TableName: usersTable,
  }));
  console.log('[users]', users);

  const {
    Items: allAlbums,
    Count: count,
    ScannedCount: scannedCount
  } = await db.send(new ScanCommand({
    TableName: albumsTable,
  }));
  console.log('[albums]', count, scannedCount, allAlbums);

  let userAlbums = new Map();
  for (const album of allAlbums) {
    const list = userAlbums.get(album.twitterUserId);
    if (list) {
      list.push(album);
    } else {
      userAlbums.set(album.twitterUserId, [album]);
    }
  }
  console.log('[user albums]', userAlbums);

  for (const user of users) {
    console.log('[user]', user);

    const { twitterUserId: userId, twitterAccessToken: accessToken, lastTweetId } = user;

    const keywords = userAlbums.get(userId);
    if (keywords === undefined) {
      console.log('[no keywords]');
      continue;
    }

    const params = new URLSearchParams();
    params.append('exclude', 'retweets,replies')
    params.append('expansions', 'author_id');
    params.append('max_results', 100);
    if (lastTweetId) {
      params.append('since_id', lastTweetId);
    }
    console.log('[params]', params.toString());

    const tweetsResponse = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!tweetsResponse.ok) {
      throw new Error(await tweetsResponse.text());
    }

    const { data: tweets } = await tweetsResponse.json();
    console.log('[tweets]', tweets.length, tweets);

    for (const tweet of tweets) {
      console.log('[tweet]', tweet);
      const { text } = tweet;
      for (const { keyword } of keywords) {
        if (text.includes(keyword)) {
          console.log('[match]');
          // TODO: save
        }
      }
    }

    const tweetId = tweets.at(0).id;
    console.log('[last tweet id]', tweetId);

    await db.send(new UpdateCommand({
      TableName: usersTable,
      Key: {
        twitterUserId: userId,
      },
      UpdateExpression: 'SET lastTweetId = :lastTweetId',
      ExpressionAttributeValues: {
        ':lastTweetId': tweetId,
      },
    }));
  }

  return { statusCode: 200 };
};
