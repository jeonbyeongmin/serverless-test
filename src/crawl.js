const axios = require("axios");
const cheerio = require("cheerio");
const AWS = require("aws-sdk");

const { blogs } = require("./util/getTechBlog");
const pad = require("./util/pad");

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com",
});

const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = "tech-scrap";

async function getLastestPost(site) {
  try {
    const posts = await docClient
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: "#site = :site",
        ExpressionAttributeNames: {
          "#site": "site",
        },
        ExpressionAttributeValues: {
          ":site": site,
        },
      })
      .promise();

    return posts.Items[posts.Items.length - 1];
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }
}

module.exports.handler = async (event, context) => {
  try {
    blogs.map(async (blog, index) => {
      await axios(blog.rss).then(async (res) => {
        const data = res.data;
        const $ = cheerio.load(data, { xmlMode: true });
        const lastestPost = await getLastestPost(blog.name);
        let isLastest = true;

        $("item").each(async (_, post) => {
          const site = blog.name;
          const title = $(post).find("title").text();
          const url = $(post).find("link").text();
          const timestamp = Date.parse($(post).find("pubDate").text());
          const id = `${timestamp}#${pad(blog.id, 4)}`;
          const category = [];

          $(post)
            .find("category")
            .each((_, cate) => {
              category.push($(cate).text());
            });

          if (lastestPost?.url === url) {
            isLastest = false;
          }

          if (isLastest) {
            await docClient
              .put({
                TableName: TABLE_NAME,
                Item: {
                  id: id,
                  site: site,
                  title: title,
                  url: url,
                  timestamp: timestamp,
                  category: category,
                },
              })
              .promise();
          }
        });
      });
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success!" }),
    };
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }
};
