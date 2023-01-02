// AWS SDK
import { unmarshall } from '@aws-sdk/util-dynamodb';

const region = 'ap-northeast-1';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// GitHub App
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';

// Environment variables
const {
  AWS_SESSION_TOKEN: awsSessionToken,
  secret_id: secretId,
  users_table: usersTable,
} = process.env;

export const cacheAlbum = async event => {
  console.log('[event]', JSON.stringify(event));

  const {
    GitHubAppId: appId,
    GitHubAppPem: pem,
    GitHubAppInstallationId: installationId,
  } = await getSecrets();

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: Buffer.from(pem, 'base64').toString(),
      installationId,
    },
  });

  const repository = {
    owner: 'SnowCait',
    repo: 'tweet-album',
  };
  const branchName = 'main';

  for (const { eventID, eventName, dynamodb } of event.Records) {
    console.log('[event id]', eventID);
    if (eventName !== 'MODIFY') {
      console.log('[event name]', eventName);
      continue;
    }

    const { twitterUserId: userId, id: albumId} = unmarshall(dynamodb.Keys);
    const { tweets: newTweets } = unmarshall(dynamodb.NewImage);
    const { tweets: oldTweets } = unmarshall(dynamodb.OldImage);

    if (newTweets === oldTweets) {
      console.log('[up-to-date]');
      continue;
    }

    const { Item: user } = await db.send(new GetCommand({
      TableName: usersTable,
      Key: {
        twitterUserId: userId,
      },
    }));

    const {
      twitterAccessToken: accessToken,
      twitterScreenName: screenName,
    } = user;

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
    const { data: branch } = await octokit.rest.repos.getBranch({
      ...repository,
      branch: branchName,
    });
    console.log('[branch]', branch);

    const { data: tree } = await octokit.rest.git.createTree({
      ...repository,
      tree: [
        {
          path: `docs/api/${userId}/${albumId}.json`,
          mode: '100644',
          type: 'blob',
          content: json,
        },
      ],
      base_tree: branch.commit.commit.tree.sha,
    });
    console.log('[tree]', tree, tree.sha);

    const { data: commit } = await octokit.rest.git.createCommit({
      ...repository,
      message: `@${screenName}`,
      tree: tree.sha,
      parents: [
        branch.commit.sha,
      ],
    });
    console.log('[commit]', commit, commit.sha);

    const { data: ref } = await octokit.rest.git.updateRef({
      ...repository,
      ref: `heads/${branchName}`,
      sha: commit.sha,
    });
    console.log('[ref]', ref, ref.sha);
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
