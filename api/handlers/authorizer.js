
// AWS SDK
const region = 'ap-northeast-1';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
const dynamoDB = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(dynamoDB);

// Environment variables
const {
  users_table: usersTable,
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
      user,
      userId,
      accessToken,
    },
  };
  console.log('[response]', response);
  return response;
};
