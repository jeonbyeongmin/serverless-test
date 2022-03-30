const chromium = require("chrome-aws-lambda");
const cheerio = require("cheerio");

module.exports.handler = async (event, context) => {
  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // 실제로는 기술 블로그의 종류가 담겨있는 기술블로그:링크 구조의 객체가 될 것...
  const targetUrl = "https://tech.kakao.com/blog/";

  // 대충 DB에서 각 기술블로그의 가장 최근 글의 링크를 가져오는 로직
  const dbPostId = {};

  // 첫번째 문제... 기술 블로그마다 DOM 구조가 달라서 반복문을 돌리는 것이 어려움.. 어쩔 수 없는 것일까?
  // 지금으로써는 기술 블로그가 100개라면 100개에 해당하는 크롤링 코드를 작성해야 한다.

  await page.goto(targetUrl);

  let content = await page.content();
  let $ = cheerio.load(content);
  let posts = $("#posts > div > div.wrap_post > ul > li");

  posts.each((index, post) => {
    const site = "kakao"; // 실제로는 object를 불러와서 넣을 예정
    const title = $(post).find("a.link_post > strong").text().trim();
    const url = $(post).find("a.link_post").attr("href");
    const imageUrl = $(post).find("a.link_post > div > img").attr("src");
    const timeStamp = Date.now();

    // 대충 dbPostId랑 같은 post 인지 비교하는 로직. 같은 링크라면 더이상 크롤링을 할 필요가 없으니 break.

    // 대충 DB에 집어 넣는 로직
    console.log({ index, site, title, url, imageUrl, timeStamp });
  });

  // ... 다른 사이트도 비슷한 방식으로 크롤링하는 코드

  await browser.close();
};
