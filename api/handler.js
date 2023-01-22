// AWS SDK
const region = 'ap-northeast-1';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// Environment variables
const {
  AWS_SESSION_TOKEN: awsSessionToken,
  secret_id: secretId,
  users_table: usersTable,
  albums_table: albumsTable,
} = process.env;

export const authorizer = async event => {
  console.log('[event]', event);

  const [ userId, authorizationAccessToken ] = event.headers.authorization.split(':');

  const { Item: user } = await db.send(new GetCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: userId,
    },
  }));
  console.log('[user]', user);

  if (!user) {
    return { isAuthorized: false };
  }

  const isAuthorized = (authorizationAccessToken === user.authorizationAccessToken);
  let accessToken = authorizationAccessToken;

  // Expired by system
  if (user.twitterAccessToken !== user.authorizationAccessToken) {
    await db.send(new UpdateCommand({
      TableName: usersTable,
      Key: {
        twitterUserId: userId,
      },
      UpdateExpression: 'SET authorizationAccessToken = twitterAccessToken',
    }));
    accessToken = user.twitterAccessToken;
  }

  const response = {
    isAuthorized,
    context: {
      userId,
      accessToken,
    },
  };
  console.log('[response]', response);
  return response;
};

export const hello = async event => {
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

export const auth = async event => {
  console.log('[event]', event);
  console.log('[request body]', event.body);

  const { code, verifier, redirectUrl } = JSON.parse(event.body);

  // Client Secret
  const {
    TwitterClientId: clientId,
    TwitterClientSecret: clientSecret,
  } = await getSecrets();

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
  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  } = token;

  // Me
  const me = await fetchMe(accessToken);
  console.log('[me]', me);

  // Save
  const expirationTime = Date.now() + expiresIn * 1000;
  console.log('[expiration time]', new Date(expirationTime));

  await db.send(new UpdateCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: me.userId,
    },
    UpdateExpression: `SET ${[
      'twitterScreenName = :screenName',
      'twitterName = :name',
      'twitterProfileImageUrl = :profileImageUrl',
      'twitterAccessToken = :accessToken',
      'twitterRefreshToken = :refreshToken',
      'authorizationAccessToken = :accessToken',
      'expirationTime = :expirationTime',
    ].join(', ')}`,
    ExpressionAttributeValues: {
      ':screenName': me.screenName,
      ':name': me.name,
      ':profileImageUrl': me.profileImageUrl,
      ':accessToken': accessToken,
      ':refreshToken': refreshToken,
      ':expirationTime': expirationTime,
    },
  }));

  const body = JSON.stringify({
    ...me,
    accessToken,
    expirationTime,
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const showMe = async event => {
  console.log('[event]', event);

  const { userId } = event.requestContext.authorizer.lambda;

  const { Item: user } = await db.send(new GetCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: userId,
    },
  }));
  console.log('[user]', user);

  if (user === undefined) {
    throw new Error('User not found.');
  }

  let tokens = null;
  if (user.expirationTime < Date.now()) {
    tokens = await refreshAccessToken(user.twitterRefreshToken, userId, true);
  }

  const body = JSON.stringify({
    userId: user.twitterUserId,
    screenName: user.twitterScreenName,
    name: user.twitterName,
    profileImageUrl: user.twitterProfileImageUrl,
    accessToken: user.twitterAccessToken,
    expirationTime: user.expirationTime,
    ...tokens,
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const showUserByScreenName = async event => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { screenName } = event.pathParameters;

  const { Items: [ user ] } = await db.send(new QueryCommand({
    TableName: usersTable,
    KeyConditionExpression: 'twitterScreenName = :screenName',
    ExpressionAttributeValues: {
      ':screenName': screenName,
    },
    IndexName: 'screenName-index',
  }));
  console.log('[user]', user);

  const body = JSON.stringify({
    userId: user?.twitterUserId,
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const createAlbum = async event => {
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
      title: keyword,
      conditions: [
        {
          type: Type.Keyword,
          keyword,
        },
      ],
    },
  }));

  const body = JSON.stringify({ id });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const listAlbums = async event => {
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

  const body = JSON.stringify({ albums }, (k, v) => {
    if (v instanceof Set) {
      return [...v];
    } else {
      return v;
    }
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const updateAlbums = async event => {
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

  let usersAlbums = new Map();
  for (const album of allAlbums) {
    addListOnMap(usersAlbums, album.twitterUserId, album);
  }
  console.log('[user albums]', usersAlbums);

  for (const user of users) {
    console.log('[user]', user);

    // User
    const {
      twitterUserId: userId,
      twitterRefreshToken,
      expirationTime,
      lastTweetId,
    } = user;
    let { twitterAccessToken: accessToken } = user;

    // Access token
    if (expirationTime < Date.now()) {
      const tokens = await refreshAccessToken(twitterRefreshToken, userId);
      accessToken = tokens.accessToken;
    }

    // Albums
    const albums = usersAlbums.get(userId);
    if (albums === undefined) {
      console.log('[no keywords]');
      continue;
    }

    // Tweets
    const { data: tweets, meta } = await fetchTweets(accessToken, userId, lastTweetId);
    console.log('[tweets]', tweets, meta);

    if (meta.result_count === 0) {
      continue;
    }

    // Search
    const newAlbumTweets = searchTweets(tweets, albums);
    console.log('[new album tweets]', newAlbumTweets);

    // Update albums
    await updateAlbums(userId, newAlbumTweets);

    // Update last tweet
    await updateLastTweetId(userId, meta.newest_id);
  }

  return { statusCode: 200 };
};

export const showAlbum = async event => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { albumId } = event.pathParameters;
  const { userId, accessToken } = event.requestContext.authorizer.lambda;

  const { Item: album } = await db.send(new GetCommand({
    TableName: albumsTable,
    Key: {
      twitterUserId: userId,
      id: Number(albumId),
    },
  }));
  console.log('[album]', album);

  if (!album.tweets) {
    const body = JSON.stringify({ tweets: [], includes: [] });
    console.log('[response body]', body);
    return { statusCode: 200, body };
  }

  const params = new URLSearchParams();
  params.append('ids', [...album.tweets])
  params.append('expansions', 'author_id,attachments.media_keys');
  params.append('media.fields', 'preview_image_url');
  params.append('tweet.fields', 'text');
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

  const body = JSON.stringify({
    title: album.title,
    tweets,
    includes,
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const showUserAlbum = async event => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { userId, albumId } = event.pathParameters;

  const { Item: album } = await db.send(new GetCommand({
    TableName: albumsTable,
    Key: {
      twitterUserId: userId,
      id: Number(albumId),
    },
  }));
  console.log('[album]', album);

  const body = JSON.stringify({
    title: album.title,
  });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

export const deleteAlbum = async event => {
  console.log('[event]', event);
  console.log('[request path parameters]', event.pathParameters);

  const { albumId } = event.pathParameters;
  const { userId } = event.requestContext.authorizer.lambda;

  const deletesIn = 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const deletionTime = now + deletesIn;

  await db.send(new UpdateCommand({
    TableName: albumsTable,
    Key: {
      twitterUserId: userId,
      id: Number(albumId),
    },
    UpdateExpression: 'SET deletionTime = :deletionTime',
    ExpressionAttributeValues: {
      ':deletionTime': deletionTime,
    },
  }));

  const body = JSON.stringify({ deletionTime });
  console.log('[response body]', body);
  return { statusCode: 200, body };
};

async function updateAlbums(userId, newAlbumTweets) {
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
}

async function fetchTweets(accessToken, userId, lastTweetId) {
  const params = new URLSearchParams();
  params.append('exclude', 'retweets,replies');
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

  return await tweetsResponse.json();;
}

function searchTweets(tweets, albums) {
  let newAlbumTweets = new Map();
  for (const tweet of tweets) {
    console.log('[tweet]', tweet);
    const { id: tweetId, text } = tweet;
    for (const { id: albumId, conditions } of albums) {
      console.log('[conditions]', albumId, conditions);

      if (conditions === undefined) {
        continue;
      }

      for (const { type, keyword } of conditions) {
        switch (type) {
          case Type.Keyword:
            if (text.includes(keyword)) {
              console.log('[match]', albumId, tweet);
              addListOnMap(newAlbumTweets, albumId, tweetId);
            }
            break;
          case Type.Regex:
            throw new NotImplementedError('Regex type is not implemented.');
          default:
            throw new Error(`Undefined type: ${type}`);
        }
      }
    }
  }
  return newAlbumTweets;
}

function addListOnMap(map, key, value) {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

async function getSecrets() {
  const response = await fetch(`http://localhost:2773/secretsmanager/get?secretId=${secretId}`, {
    method: 'GET',
    headers: {
      'X-Aws-Parameters-Secrets-Token': awsSessionToken,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const secrets = await response.json();
  return JSON.parse(secrets.SecretString);
}

async function updateLastTweetId(userId, lastTweetId) {
  console.log('[last tweet id]', lastTweetId);

  await db.send(new UpdateCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: userId,
    },
    UpdateExpression: 'SET lastTweetId = :lastTweetId',
    ExpressionAttributeValues: {
      ':lastTweetId': lastTweetId,
    },
  }));
}

/**
 * @param {string} accessToken
 * @returns
 */
async function fetchMe(accessToken) {
  const params = new URLSearchParams();
  params.append('user.fields', 'profile_image_url');
  console.log('[params]', params.toString());

  const response = await fetch(`https://api.twitter.com/2/users/me?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const { data: me } = await response.json();
  return {
    userId: me.id,
    screenName: me.username,
    name: me.name,
    profileImageUrl: me.profile_image_url,
  };
}

/**
 * @param {string} refreshToken
 * @param {string} userId
 * @param {boolean} isUserAccess
 * @returns
 */
async function refreshAccessToken(refreshToken, userId, isUserAccess = false) {
  console.log('[refresh token]', refreshToken);

  // Client Secret
  const {
    TwitterClientId: clientId,
    TwitterClientSecret: clientSecret,
  } = await getSecrets();

  // Refresh token
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const tokens = await response.json();
  console.log('[tokens]', tokens);
  const {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    expires_in: expiresIn,
  } = tokens;

  // Save (If failed, inconsistency is caused. Try re-login manually.)
  const expirationTime = Date.now() + expiresIn * 1000;
  console.log('[expiration time]', new Date(expirationTime));

  let additionalUpdateExpressionAttributes = [];
  let additionalExpressionAttributeValues = null;
  if (isUserAccess) {
    const me = await fetchMe(accessToken);
    console.log('[me]', me);

    additionalUpdateExpressionAttributes = [
      'twitterScreenName = :screenName',
      'twitterName = :name',
      'twitterProfileImageUrl = :profileImageUrl',
      'authorizationAccessToken = :accessToken',
    ];

    additionalExpressionAttributeValues = {
      ':screenName': me.screenName,
      ':name': me.name,
      ':profileImageUrl': me.profileImageUrl,
    };
  }

  await db.send(new UpdateCommand({
    TableName: usersTable,
    Key: {
      twitterUserId: userId,
    },
    UpdateExpression: `SET ${[
      'twitterAccessToken = :accessToken',
      'twitterRefreshToken = :refreshToken',
      'expirationTime = :expirationTime',
      ...additionalUpdateExpressionAttributes,
    ].join(', ')}`,
    ExpressionAttributeValues: {
      ':accessToken': accessToken,
      ':refreshToken': newRefreshToken,
      ':expirationTime': expirationTime,
      ...additionalExpressionAttributeValues,
    },
  }));

  return {
    accessToken,
    expirationTime,
  };
}

const Type = Object.freeze({
  Keyword: 'keyword',
  Regex: 'regex',
});

class NotImplementedError extends Error {}
