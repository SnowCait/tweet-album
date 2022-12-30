'use strict';

// AWS SDK
const region = 'ap-northeast-1';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// Environment variables
const {
  AWS_SESSION_TOKEN: awsSessionToken,
  secret_id: secretId,
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
  console.log('[request body]', event.body);

  const { code, verifier, redirectUrl } = JSON.parse(event.body);

  // Client Secret
  const secretsResponse = await fetch(`http://localhost:2773/secretsmanager/get?secretId=${secretId}`, {
    method: 'GET',
    headers: {
      'X-Aws-Parameters-Secrets-Token': awsSessionToken,
    },
  });
  const secrets = await secretsResponse.json();
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
      'Content-Type': 'application/json',
    },
  });

  if (!meResponse.ok) {
    throw new Error(await meResponse.text());
  }

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

  const body = JSON.stringify({ ...token, ...me });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

module.exports.createAlbum = async (event) => {
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

  const body = JSON.stringify({ id });
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

  const body = JSON.stringify({ albums });
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

    if (tweets.length === 0) {
      continue;
    }

    let newAlbumTweets = new Map();

    for (const tweet of tweets) {
      console.log('[tweet]', tweet);
      const { id: tweetId, text } = tweet;
      for (const { id: albumId, keyword } of keywords) {
        if (text.includes(keyword)) {
          console.log('[match]', albumId, tweet);
          const list = newAlbumTweets.get(albumId);
          if (list) {
            list.append(tweetId);
          } else {
            newAlbumTweets.set(albumId, [tweetId]);
          }
        }
      }
    }

    for (const [ albumId, albumTweets ] of newAlbumTweets) {
      console.log('[album tweets]', albumTweets);
      await db.send(new UpdateCommand({
        TableName: albumsTable,
        Key: {
          twitterUserId: userId,
          id: albumId,
        },
        UpdateExpression: 'ADD tweets :tweets',
        ExpressionAttributeValues: {
          ':tweets': new Set(albumTweets),
        },
      }));
    }

    const newestTweetId = tweets.at(0).id;
    console.log('[last tweet id]', newestTweetId);

    await db.send(new UpdateCommand({
      TableName: usersTable,
      Key: {
        twitterUserId: userId,
      },
      UpdateExpression: 'SET lastTweetId = :lastTweetId',
      ExpressionAttributeValues: {
        ':lastTweetId': newestTweetId,
      },
    }));
  }

  return { statusCode: 200 };
};

module.exports.showAlbum = async (event) => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { userId, albumId } = event.pathParameters;
  const { accessToken } = event.requestContext.authorizer.lambda;

  const { Item: album } = await db.send(new GetCommand({
    TableName: albumsTable,
    Key: {
      twitterUserId: userId,
      id: Number(albumId),
    },
  }));
  console.log('[album]', album);

  const params = new URLSearchParams();
  params.append('ids', [...album.tweets])
  params.append('expansions', 'author_id');
  params.append('user.fields', 'id,name,profile_image_url,protected,url,username');
  console.log('[params]', params.toString());

  const response = await fetch(`https://api.twitter.com/2/tweets?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const { data: tweets, includes } = await response.json();
  console.log('[tweets]', album.tweets.length, tweets.length, tweets);
  console.log('[includes]', includes);

  const body = JSON.stringify({ tweets, includes });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};
