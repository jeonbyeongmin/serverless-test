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

async function putPost(item) {
  try {
    await docClient
      .put({
        TableName: TABLE_NAME,
        Item: {
          id: item.id,
          site: item.site,
          title: item.title,
          url: item.url,
          timestamp: item.timestamp,
          category: item.category,
        },
      })
      .promise();
  } catch (error) {
    throw new Error("Failed during putting item to db", error);
  }
}

module.exports.handler = async (event, context) => {
  try {
    await Promise.all(
      blogs.map(async (blog, index) => {
        const response = await axios.get(blog.rss);
        const data = response.data;
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
            await putPost({ site, title, url, id, category, timestamp });
            console.log({ site, title, url, id, category, timestamp });
          }
        });
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success!" }),
    };
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }
};
