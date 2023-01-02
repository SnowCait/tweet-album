// AWS SDK
import { unmarshall } from '@aws-sdk/util-dynamodb';

const region = 'ap-northeast-1';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// GitHub App
import { createAppAuth } from '@octokit/auth-app';

// Environment variables
const {
  AWS_SESSION_TOKEN: awsSessionToken,
  secret_id: secretId,
  users_table: usersTable,
} = process.env;

export const cacheAlbum = async event => {
  console.log('[event]', JSON.stringify(event));

  for (const { eventID, eventName, dynamodb } of event.Records) {
    console.log('[event id]', eventID);
    if (eventName !== 'MODIFY') {
      console.log('[event name]', eventName);
      continue;
    }

    const newRecord = unmarshall(dynamodb.NewImage);
    const oldRecord = unmarshall(dynamodb.OldImage);
    console.log(newRecord, oldRecord);
    const { twitterUserId, tweets: newTweets } = newRecord;
    const { tweets: oldTweets } = oldRecord;

    if (newTweets === oldTweets) {
      console.log('[up-to-date]');
      continue;
    }

    const { Item: user } = await db.send(new GetCommand({
      TableName: usersTable,
      Key: {
        twitterUserId,
      },
    }));

    const { twitterAccessToken: accessToken } = user;

    // Twitter
    const params = new URLSearchParams();
    params.append('ids', [...newTweets])
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

    const json = await response.text();
    console.log('[json]', json);

    // GitHub
    const {
      GitHubAppId: appId,
      GitHubAppPem: pem,
      GitHubAppClientId: clientId,
      GitHubAppClientSecret: clientSecret,
    } = await getSecrets();
    const auth = createAppAuth({
      appId,
      privateKey: Buffer.from(pem, 'base64').toString(),
      clientId,
      clientSecret,
    });
    const { token } = await auth({ type: 'app' });
  }
};

async function getSecrets() {
  const secretsResponse = await fetch(`http://localhost:2773/secretsmanager/get?secretId=${secretId}`, {
    method: 'GET',
    headers: {
      'X-Aws-Parameters-Secrets-Token': awsSessionToken,
    },
  });
  const secrets = await secretsResponse.json();
  return JSON.parse(secrets.SecretString);
}
