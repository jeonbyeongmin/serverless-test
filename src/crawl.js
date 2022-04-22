const axios = require("axios");
const cheerio = require("cheerio");
const AWS = require("aws-sdk");

const { blogs } = require("./util/getTechBlog");
const pad = require("./util/pad");

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com",
});

const dynamo = new AWS.DynamoDB.DocumentClient();

async function getLastestPost(site) {
  try {
    const posts = await dynamo
      .query({
        TableName: "CrawlingPosts",
        IndexName: "SitePostIdIndex",
        KeyConditionExpression: "#Site = :Site",
        ExpressionAttributeNames: {
          "#Site": "Site",
        },
        ExpressionAttributeValues: {
          ":Site": site,
        },
        ScanIndexForward: false,
      })
      .promise();
    return posts.Items[0];
  } catch (error) {
    throw new Error("Failed during getting lastest post item", error);
  }
}

async function putPost(item) {
  try {
    await dynamo
      .put({
        TableName: "CrawlingPosts",
        Item: {
          Type: item.type,
          PostId: item.id,
          Site: item.site,
          SiteUrl: item.siteUrl,
          Title: item.title,
          Timestamp: item.timestamp,
          Category: item.category,
          ImageUrl: item.imageUrl,
          Views: 0,
        },
      })
      .promise();
  } catch (error) {
    throw new Error("Failed during putting item to db", error);
  }
}

async function fetchHtml(link) {
  return await axios.get(link);
}

async function parseImageUrl(url) {
  try {
    const { data } = await fetchHtml(url);
    const $ = cheerio.load(data);
    const content = $(`head > meta[property="og:image"]`).attr("content");
    return content;
  } catch (error) {
    return undefined;
  }
}

module.exports.handler = async (event, context) => {
  try {
    await Promise.all(
      blogs.map(async (blog, index) => {
        const { data } = await fetchHtml(blog.rss);
        const $ = cheerio.load(data, { xmlMode: true });
        const lastestPost = await getLastestPost(blog.name);
        let isLastest = true;

        $("item").each(async (_, post) => {
          const type = "tech";
          const site = blog.name;
          const title = $(post).find("title").text();
          const siteUrl = $(post).find("link").text();
          const timestamp = Date.parse($(post).find("pubDate").text());
          const id = `${timestamp}#${pad(blog.id, 4)}`;
          const category = [];

          $(post)
            .find("category")
            .each((_, cate) => {
              category.push($(cate).text());
            });

          if (lastestPost?.SiteUrl === siteUrl) {
            isLastest = false;
          }

          if (isLastest) {
            const imageUrl = await parseImageUrl(siteUrl);
            await putPost({
              type,
              site,
              title,
              siteUrl,
              id,
              category,
              timestamp,
              imageUrl,
            });
            console.log({
              type,
              site,
              title,
              siteUrl,
              id,
              category,
              timestamp,
              imageUrl,
            });
          }
        });
      })
    );
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Success!" }),
  };
};
