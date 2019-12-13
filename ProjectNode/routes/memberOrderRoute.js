const express = require("express"); //引入express應用程式
const router = express.Router();
const mysql = require("mysql");
const db_Obj = require("C:/Users/__connect.json"); //連線到資料庫
const db = mysql.createConnection(db_Obj);
const bluebird = require("bluebird"); //使用兩次sql
bluebird.promisifyAll(db);
const moment = require("moment-timezone");
const nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

// import OrderDetail from "../domain/memberOrder";

// 測試用
router.get("/", (req, res) => {
  res.send("Member-OrderPage");
});

// 獲取使用者所有課程訂單簡介
router.get("/course/:id", (req, res) => {
  const memberId = req.params.id;
  let sql =
    "SELECT * FROM `order` `o` JOIN `course_order` `co` JOIN `course` `c` JOIN `course_img` `ci` ON `o`.order_sid = `co`.order_sid AND `co`.`course_sid` = `c`.`course_sid` AND `co`.`course_sid` = `ci`.`course_sid` WHERE `o`.member_sid = " +
    memberId;
  db.queryAsync(sql).then(results => {
    const formatDate = "YYYY-MM-DD HH:mm:ss";
    // 拿到多筆結果後利用迴圈將其中的日期格式改變
    results.forEach(function(v) {
      v.course_order_choose = moment(v.course_order_choose)
        .tz("Asia/Taipei")
        .format(formatDate);
    });
    // 傳回成json檔
    res.json(results);
  });
});

// 獲取使用者所有訂單
router.get("/orderSid/:id", (req, res) => {
  const memberId = req.params.id;
  sql = "SELECT * FROM `order` WHERE `member_sid` = " + memberId;
  db.queryAsync(sql).then(results => {
    res.json(results);
  });
});

// 獲取使用者所有食材訂單簡介
router.get("/ingre/:id", (req, res) => {
  const memberId = req.params.id;
  sql =
    "SELECT * FROM `order` `o` JOIN `ingredients_order` `io` JOIN `ingredients` `i` ON `o`.`order_sid` = `io`.`order_sid` AND `i`.`ingredients_sid` = `io`.`ingredients_sid` WHERE `o`.`member_sid` = " +
    memberId;
  db.queryAsync(sql).then(results => {
    res.json(results);
  });
});

// 獲取使用者所有課程訂單簡介
router.get("/subject/:id", (req, res) => {
  const memberId = req.params.id;
  sql =
    "SELECT * FROM `order` o JOIN `subject_order` so JOIN `subject` s ON o.order_sid = so.order_sid AND so.subject_sid = s.subject_sid WHERE o.member_sid = " +
    memberId;
  db.queryAsync(sql).then(results => {
    const formatDate = "YYYY-MM-DD HH:mm:ss";
    results.forEach(function(v) {
      v.subject_date = moment(v.subject_date)
        .tz("Asia/Taipei")
        .format(formatDate);
    });
    res.json(results);
  });
});

// 類別訂單詳細
class OrderDetail {
  constructor(orderType, user, item) {
    this.orderType = orderType;
    this.user = user;
    this.item = item;
  }
  // 類別中的函式，使用建構式時變數會放到sql中回傳
  orderDetailSQL() {
    let sql = "";
    // 依照type來回傳不同的sql對應不同類的詳細
    switch (this.orderType) {
      case 1: {
        sql =
          "SELECT * FROM `order` `o` JOIN `course_order` `co` JOIN `course` `c` JOIN `course_img` `ci` JOIN `store` `s` ON `o`.order_sid = `co`.order_sid AND `co`.`course_sid` = `c`.`course_sid` AND `co`.`course_sid` = `ci`.`course_sid` WHERE `s`.store_sid = `c`.`store_sid` AND `o`.member_sid = " +
          this.user +
          " AND `co`.course_order_sid = " +
          this.item;
        return sql;
        break;
      }
      case 2: {
        sql =
          "SELECT * FROM ((`order` NATURAL JOIN `ingredients_order`) NATURAL JOIN `ingredients`) WHERE `order`.`member_sid` = " +
          this.user +
          " AND `ingredients_order`.ingredients_order_sid = " +
          this.item;
        return sql;
        break;
      }
      case 3: {
        sql =
          "SELECT * FROM `order` JOIN `subject_order` JOIN `subject` JOIN `subject_img` JOIN `teacher` ON `subject`.`subject_sid` = `subject_order`.`subject_sid` AND `order`.`order_sid` = `subject_order`.`order_sid` AND `subject_img`.`subject_sid` = `subject`.`subject_sid` AND `subject`.`teacher_sid` = `teacher`.`teacher_sid` WHERE `order`.`member_sid` =" +
          this.user +
          " AND `subject_order`.`subject_order_sid` = " +
          this.item;
        console.log(sql);
        return sql;
        break;
      }
      default:
        return;
    }
  }
  static orderDefaultSQL(id) {
    let sql =
      "SELECT * FROM `order` `o` JOIN `course_order` `co` JOIN `course` `c` JOIN `course_img` `ci` ON `o`.order_sid = `co`.order_sid AND `co`.`course_sid` = `c`.`course_sid` AND `co`.`course_sid` = `ci`.`course_sid` WHERE `o`.member_sid = " +
      id +
      " order by `o`.`order_sid` DESC LIMIT 1";
  }
}

router.post("/orderDetail", (req, res, next) => {
  let orderDetail = new OrderDetail(
    req.body.orderType,
    req.body.user,
    req.body.item
  );
  // 建構物件
  db.query(orderDetail.orderDetailSQL(), (error, rows) => {
    console.log(rows);
    if (error) {
      res.json({
        status: "404",
        message: "伺服器錯誤，請稍後在試！"
      });
      return;
    } else {
      const formatDate = "YYYY-MM-DD HH:mm:ss";
      if (rows[0].course_order_choose) {
        rows[0].course_order_choose = moment(rows[0].course_order_choose)
          .tz("Asia/Taipei")
          .format(formatDate);
        rows[0].order_create_time = moment(rows[0].order_create_time)
          .tz("Asia/Taipei")
          .format(formatDate);
      } else if (rows[0].subject_date) {
        rows[0].subject_date = moment(rows[0].subject_date)
          .tz("Asia/Taipei")
          .format(formatDate);
        rows[0].order_create_time = moment(rows[0].order_create_time)
          .tz("Asia/Taipei")
          .format(formatDate);
      } else {
        rows[0].order_create_time = moment(rows[0].order_create_time)
          .tz("Asia/Taipei")
          .format(formatDate);
      }
      res.json(rows[0]);
      return;
    }
  });
});

router.get("/orderDetail/:id", (req, res, next) => {
  const id = req.params.id;
  db.query(OrderDetail.orderDetailSQL(id), (error, rows) => {
    if (error) {
      res.json({
        status: "404",
        message: "伺服器錯誤，請稍後在試！"
      });
      return;
    } else {
      const formatDate = "YYYY-MM-DD HH:mm:ss";
      rows[0].course_order_choose = moment(rows[0].course_order_choose)
        .tz("Asia/Taipei")
        .format(formatDate);
      res.json(rows[0]);
      return;
    }
  });
});

router.post("/mailToReport", (req, res) => {
  let email = req.body.email;
  let account = req.body.member;
  let productName = req.body.productName;
  let report = req.body.message;
  let orderSid = req.body.orderSid;
  const customerFeedBack = (email, account, productName, report, orderSid) => {
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "handmade20190927@gmail.com",
        pass: "Aa27089433"
      }
    });
    let mailOptions = {
      from: "handmade20190927@gmail.com",
      to: email,
      subject: "商品問題回報:" + productName + "------ 訂單編號" + orderSid,
      html: `
        <h2>${productName} 問題回報</h2>
        <br>
        <h2>親愛的會員: ${account}</h2>
        <h4>${report}</h4>
        <br>
        <h4>目前已在處理中，請靜待回覆</h4>
        `
    };
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        return console.log(error);
      } else {
        return console.log("訊息發送: " + info.response);
      }
    });
    return res.json({
      status: "202",
      message: "問題已送至客服,請至信箱確認"
    });
  };
  customerFeedBack(email, account, productName, report, orderSid);
});

module.exports = router;
