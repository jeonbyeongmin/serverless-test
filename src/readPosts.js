const AWS = require("aws-sdk");

const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, conteext) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
  };

  // const postId = event?.pathParameters?.postId;
  // const type = event?.pathParameters?.type;

  try {
    const params = {
      TableName: "CrawlingPosts",
      KeyConditionExpression: "#Type = :Type",
      ExpressionAttributeNames: {
        "#Type": "Type",
      },
      ExpressionAttributeValues: {
        ":Type": "tech",
      },
      ScanIndexForward: false,
      Limit: 20,
    };

    // if (postId) params.ExclusiveStartKey = { PostId: postId, Type: type };

    body = await dynamo.query(params).promise();
  } catch (error) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
