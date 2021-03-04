const gulp = require("gulp");
var gulpsync = require('gulp-sync')(gulp);
const htmlmin = require('gulp-htmlmin');
const fs = require('fs');
const fse = require('fs-extra')
const xml2js = require('xml2js')
const workbox = require('workbox-build');
const shell = require('gulp-shell')
const axios = require('axios');


const parser = new xml2js.Parser();
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var xz_appid = '1613049289050283';
var xz_token = 'PEQAd9p3kMBAzNjY';
var baidu_token= 'QsL3LjB4I2GLWGbj' 
var urlCount = 75;

gulp.task('minify', () => {
    return gulp.src('public/**/*.html')
      .pipe(htmlmin({ 
        // removeComments: true,//清除HTML注释
        collapseWhitespace: true,//压缩HTML
        // collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />
        // removeEmptyAttributes: true,//删除所有空格作属性值 <input id="" /> ==> <input />
        // removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"
        // removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"
        // minifyJS: true,//压缩页面JS
        // minifyCSS: true//压缩页面CSS
       }))
      .pipe(gulp.dest('public'));
  });
gulp.task('build',function(done){
    return gulp.src('./').pipe(shell(['hugo --buildFuture']))
});

gulp.task('deploy',function(done){
    return gulp.src('./').pipe(shell(['node oss.js']))
});

gulp.task('baiduSeo', () => {
    fs.readFile(__dirname + '/public/sitemap.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            urlSubmit(result.urlset.url)
            console.log('Done');
        });
    });
  });




gulp.task('getTodayData', () => {
  return  axios.get('https://rest.shanbay.com/api/v2/quote/quotes/today/')
    .then(function (response) {
        fse.writeJsonSync('./static/data/today.json',response.data)
        console.log('今日骚话:',response.data.data.translation);
    })
    .catch(function (error) {
      console.log('骚话获取失败',error);
    });
  });


gulp.task('generate-service-worker', () => {
    return workbox
    .generateSW({
        // cacheId: '', // 设置前缀
        globDirectory: './public', //匹配根目录
        globPatterns: ['**/*.{woff2,woff,js,css,png.jpg}'], // 匹配的文件
        globIgnores: ['sw.js'], // 忽略的文件
        swDest: `./public/sw.js`, // 输出 Service worker 文件
        clientsClaim: true, // Service Worker 被激活后使其立即获得页面控制权
        skipWaiting: true, // 强制等待中的 Service Worker 被激活
        runtimeCaching: [
            // 配置路由请求缓存 对应 workbox.routing.registerRoute
            {
                urlPattern: /.*\.js/, // 匹配文件
                handler: 'networkFirst' // 网络优先
            },
            {
                urlPattern: /.*\.css/,
                handler: 'staleWhileRevalidate', // 缓存优先同时后台更新
                options: {
                    // 这里可以设置 cacheName 和添加插件
                    plugins: [
                        {
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    ]
                }
            },
            {
                urlPattern: /.*\.(?:png|jpg|jpeg|svg|gif)/,
                handler: 'cacheFirst', // 缓存优先
                options: {
                    plugins: [
                        {
                            expiration: {
                                // maxAgeSeconds: 360, // 最长缓存时间,
                                maxEntries: 50 // 最大缓存图片数量
                            }
                        }
                    ]
                }
            },
            {
                urlPattern: /.*\.html/,
                handler: 'networkFirst'
            }
        ]
    })
    .then(() => {
        console.info('Service worker generation completed.');
    })
    .catch(error => {
        console.warn('Service worker generation failed: ' + error);
    });
  });





gulp.task('sendMessage', () => {
    let msgUrl = 'https://xizhi.qqoq.net/XZ69d0fc72426ced1c020c56f9b045957e.send';
    let data = {
        title:"Hello Alili 博客部署成功",
        content:`
        世界上 ，没有一拳解决不了的事，
        如果有，那就两拳 
        ——– ONE PUNCH-MAN
`
    }
    console.log("开始通知博主")
    return  axios.post(msgUrl,data)
      .then(function (response) {
        console.log('通知完毕')
      })
      .catch(function (error) {
        console.log('通知发送失败',error);
      });

    });


function urlSubmit(urls) {
    // 最新内容提交
    var new_target = "http://data.zz.baidu.com/urls?appid="+xz_appid+"&token="+xz_token+"&type=realtime"
    
    // 历史提交
    var history_target = "http://data.zz.baidu.com/urls?appid="+xz_appid+"&token="+xz_token+"&type=batch"

    // 百度站长
    var baidu_target = "http://data.zz.baidu.com/urls?site=https://alili.tech&token="+baidu_token

    // MIP
    var MIP_target = "http://data.zz.baidu.com/urls?site=https://alili.tech&token=QsL3LjB4I2GLWGbj&type=mip"

    // AMP
    var AMP_target = "http://data.zz.baidu.com/urls?site=https://alili.tech&token=QsL3LjB4I2GLWGbj&type=amp"

    // 最新url,看熊掌号情况而定
    urls = urls.map(item=>item.loc[0])
    let allurlsArr = urls.slice(0,1999)
    allUrls = allurlsArr.join('\n')

    var new_urls_Arr = urls.slice(0,urlCount)
    new_urls= new_urls_Arr.join('\n');

    console.info('百度站长开始提交',new_urls)
    sendData(baidu_target,new_urls,'百度站长提交成功')

    console.info('熊掌号开始提交')
    sendData(new_target,new_urls,'熊掌号提交完成')

    // 提交历史url 每天最多500w条
    console.info("历史数据开始提交")
    sendData(history_target,allUrls,"历史数据提交完成")

    console.info("MIP 开始提交")
    sendData(MIP_target,allUrls,"MIP提交成功")

    console.info("AMP 开始提交")
    sendData(AMP_target,allUrls,"AMP提交成功")

    function sendData(target,urls,message){
        var xhr = new XMLHttpRequest();
        xhr.open('POST', target, false);
        xhr.setRequestHeader('Content-type', 'text/plain');
        xhr.onload = function () {
            console.log(this.responseText);
            if(message){console.info(message)}
        };
        xhr.send(urls);
    }

};




gulp.task("default",gulpsync.sync([
    'getTodayData',
    'build',
    'baiduSeo',
    "generate-service-worker",
    'minify',
    'sendMessage'
]))



