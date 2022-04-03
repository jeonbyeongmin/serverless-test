const chromium = require("chrome-aws-lambda");
const cheerio = require("cheerio");
const AWS = require("aws-sdk");

const pad = require("./util/pad");
const getToday = require("./util/getToday");

AWS.config.update({
  region: "ap-northeast-2",
  endpoint: "http://dynamodb.ap-northeast-2.amazonaws.com",
});

const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = "tech-scrap";

async function getLastestPost(site) {
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
}

module.exports.handler = async (event, context) => {
  try {
    // DB에서 각 기술블로그의 가장 최근 글을 가져옴
    const kakaoLastestPost = await getLastestPost("kakao");
    const kakaoLastestId = Number(kakaoLastestPost.id.split("#")[1]);

    const browser = await chromium.puppeteer.launch({
      executablePath: await chromium.executablePath,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    const targetUrl = "https://tech.kakao.com/blog/";

    await page.goto(targetUrl);

    let content = await page.content();
    let $ = cheerio.load(content);
    let kakaoPosts = $("#posts > div > div.wrap_post > ul > li");
    let isLastest = true;

    kakaoPosts.each(async (index, post) => {
      const id = `kakao#${pad(
        kakaoLastestId + kakaoPosts.length - (index + 1),
        7
      )}`;
      const site = "kakao";
      const title = $(post).find("a.link_post > strong").text().trim();
      const url = $(post).find("a.link_post").attr("href");
      const imageUrl = $(post).find("a.link_post > div > img").attr("src");
      const postingDate = getToday();

      if (kakaoLastestPost.url === url) {
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
              imageUrl: imageUrl,
              postingDate: postingDate,
            },
          })
          .promise();
      }
    });

    await browser.close();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success!" }),
    };
  } catch (error) {
    throw new Error(`Failed: ${error}`);
  }
};
