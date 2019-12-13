// ---------模組導入---------
const express = require("express"); //引入express應用程式
const app = express();
const multer = require("multer"); //引入檔案
const upload = multer({ dest: "tmp_uploads" }); //設定檔案暫存目錄
const fs = require("fs"); //讀檔案寫檔案
const mysql = require("mysql"); //mysql資料庫引入
const moment = require("moment-timezone"); //解析時間格式
const session = require("express-session"); //session設定
const cors = require("cors"); //導入開放網域模組
const db_Obj = require("C:/Users/__connect.json"); //連線到資料庫
const db = mysql.createConnection(db_Obj);
const bluebird = require("bluebird"); //使用兩次sql
const bodyParser = require("body-parser");
bluebird.promisifyAll(db);
const io = require("socket.io")();

db.connect(function(err) {
  if (err) {
    console.log(err + "資料庫連線錯誤");
    return;
  } else {
    console.log("資料庫連線成功");
  }
});

// ---------模組導入結束---------

// ---------中間層(mid)---------
const whitelist = ["http://localhost:3000", undefined];
let corsOptions = {
  credentials: true,
  origin: function(origin, callback) {
    console.log("origin:" + origin);
    if (whitelist.indexOf(origin) >= 0) {
      callback(null, true); //前面放錯誤物件,後面布林值0或1 0不允許
    } else {
      callback(new Error("noWhitelist")); //會讓SERVER停下
      callback(new Error("noWhitelist"), false); //前面放錯誤物件,後面布林值0或1 1允許
    }
  }
};
app.use(express.static("public")); //靜態資料夾
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors(corsOptions)); //使用開放網域
app.use(
  session({
    //上面兩個未來預設可能會變成true先設定好
    saveUninitialized: false,
    resave: false,
    secret: "69",
    //存活時間cookie底下才有session
    cookie: {
      maxAge: 1200000
    }
  })
);

// ---------中間層(mid)結束---------

//---------中間層(route)路由---------

const handmadeRoute = require("../routes/handmadeRoute");
app.use("/handmade", handmadeRoute);

const memberRoute = require("../routes/memberRoute");
app.use("/handmade/member", memberRoute);

const storeRoute = require("../routes/storeRoute");
app.use("/handmade/store", storeRoute);

const courseRoute = require("../routes/courseRoute");
app.use("/handmade/store/course", courseRoute);

const teacherRoute = require("../routes/teacherRoute");
app.use("/handmade/teacher", teacherRoute);

const ingredientsRoute = require("../routes/ingredientsRoute");
app.use("/handmade/ingredients", ingredientsRoute);

const cartRoute = require("../routes/cartRoute");
app.use("/handmade/cart", cartRoute);

const memberOrderRoute = require("../routes/memberOrderRoute");
app.use("/handmade/member/order", memberOrderRoute);

const couponRoute = require("../routes/couponRoute");
app.use("/handmade/coupon", couponRoute);

// ---------中間層結束---------

//----------網頁錯誤----------
app.use((req, res) => {
  res.status(404).send("路由出錯誤");
});
//----------網頁錯誤----------

//給一個port:3000不能重複
const server = app.listen(5000, function() {
  console.log("已經啟動:http://localhost:5000/");
});
