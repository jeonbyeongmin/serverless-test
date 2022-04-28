const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
  };

  const postId = event?.queryStringParameters?.postId;

  try {
    const params = {
      TableName: "CrawlingPosts",
      Key: {
        Type: "tech",
        PostId: postId,
      },
      ExpressionAttributeNames: {
        "#post_views": "Views",
      },
      UpdateExpression: "set #post_views = #post_views + :val",
      ExpressionAttributeValues: {
        ":val": 1,
      },
      ReturnValues: "UPDATED_NEW",
    };

    body = await dynamo.update(params).promise();
  } catch (error) {
    statusCode = 400;
    body = error.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
