// 文件读取包
const fs = require('fs');
// 引入 RSS 解析第三方包
const Parser = require('rss-parser');
const parser = new Parser();
// 引入 RSS 生成器
const RSS = require('rss');

//引入新的RSS解析包
const feedreader = require('@extractus/feed-extractor');

// 相关配置
const opmlXmlContentTitle = 'NJU-LUG Blogroll';
const readmeMdPath = './README.md';
const opmlJsonPath = './web/src/assets/opml.json';
const dataJsonPath = './web/src/assets/data.json';
const maxDataJsonItemsNumber = 40;  // 保存前四十项
const opmlXmlPath = './web/public/opml.xml';
const rssXmlPath = './web/public/rss.xml';
const opmlXmlContentOp = '<opml version="2.0">\n  <head>\n    <title>' + opmlXmlContentTitle + '</title>\n  </head>\n  <body>\n\n';
const opmlXmlContentEd = '\n  </body>\n</opml>';

// 解析 README 中的表格，转为 JSON
const pattern = /\| *([^\|]*) *\| *(http[^\|]*) *\| *(http[^\|]*) *\|/g;
const readmeMdContent = fs.readFileSync(readmeMdPath, { encoding: 'utf-8' });
// 生成 opml.json
const opmlJson = [];
let resultArray;
while ((resultArray = pattern.exec(readmeMdContent)) !== null) {
  opmlJson.push({
    title: resultArray[1].trim(),
    xmlUrl: resultArray[2].trim(),
    htmlUrl: resultArray[3].trim()
  });
}
// 保存 opml.json 和 opml.xml
fs.writeFileSync(opmlJsonPath, JSON.stringify(opmlJson, null, 2), { encoding: 'utf-8' });
const opmlXmlContent = opmlXmlContentOp
  + opmlJson.map((lineJson) => `  <outline title="${lineJson.title}" xmlUrl="${lineJson.xmlUrl}" htmlUrl="${lineJson.htmlUrl}" />\n`).join('')
  + opmlXmlContentEd;
fs.writeFileSync(opmlXmlPath, opmlXmlContent, { encoding: 'utf-8' });

const dataJson = [];
// 异步处理
(async () => {
  
  // 用于存储各项数据
  
  
  for (const lineJson of opmlJson) {
    
    try {
      
      // 读取 RSS 的具体内容
      //const feed = await parser.parseURL(lineJson.xmlUrl);
      console.log("1")
      const feed = await feedreader.extract(lineJson.xmlUrl);
      console.log("2")
      
      // 数组合并
      dataJson.push.apply(dataJson, feed.entries.filter((item) => item.title && item.description && item.published).map((item) => {
        const pubDate = new Date(item.published);
        console.log(pubDate)
        return {
          name: lineJson.title,
          xmlUrl: lineJson.xmlUrl,
          htmlUrl: lineJson.htmlUrl,
          title: item.title,
          link: item.link,
          summary: item.description ,
          pubDate: pubDate,
          pubDateYYMMDD: pubDate.toISOString().split('T')[0]
        }
      }));
      console.log("3")
      
    } catch (err) {

      // 网络超时，进行 Log 报告
      console.log(err);
      console.log("-------------------------");
      console.log("xmlUrl: " + lineJson.xmlUrl);
      console.log("-------------------------");
      
    }
  }

  // 按时间顺序排序
  dataJson.sort((itemA, itemB) => itemA.pubDate < itemB.pubDate ? 1 : -1);
  // 默认为保存前 n 项的数据, 并保证不超过当前时间
  const curDate = new Date();
  const dataJsonSliced = dataJson.filter((item) => item.pubDate <= curDate).slice(0, Math.min(maxDataJsonItemsNumber, dataJson.length));
  fs.writeFileSync(dataJsonPath, JSON.stringify(dataJsonSliced, null, 2), { encoding: 'utf-8' });
  
  // 生成 RSS 文件
  console.log(dataJson[0].pubDate)
  var feed = new RSS({
    title: 'LUT-KP Blogroll',
    description: '兰州理工大学鲲鹏展翅博客活动',
    feed_url: 'https://kp.benyinshisan.cf/rss.xml',
    site_url: 'https://kp.benyinshisan.cf/',
    image_url: 'https://kp.benyinshisan.cf/assets/logo.56c0d74c.png',
    docs: 'https://kp.benyinshisan.cf/',
    managingEditor: 'LUT-KP',
    webMaster: 'LUT-KP',
    copyright: '2023 LUT-KP',
    language: 'cn',
    pubDate: dataJson[0].pubDate,
    ttl: '60',
  });
  
  for (let item of dataJsonSliced) {
    feed.item({
      title: item.title,
      description: item.summary,
      url: item.link, // link to the item
      author: item.name, // optional - defaults to feed author property
      date: item.pubDate.toISOString(), // any format that js Date can parse.
    });
  }
  
  // 保存 rss.xml 文件
  const rssXmlContent = feed.xml();
  fs.writeFileSync(rssXmlPath, rssXmlContent, { encoding: 'utf-8' });
  
})();
