var express = require('express')
var router = express.Router()
router.get('/', function(req, res, next) {
  var mysql = require('mysql');
  var connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    database: 'untakecourage',
    password: 'Nagachan0226DB_'
  });
  var ret=[];
  connection.connect();
  connection.query('select * from talks;', function(error, row, fields){
    if (error) {
      console.log(error);
    }
    var dat = [];
    for (var i = 0;i < row.length; i++) {
      dat.push({
        id: row[i].id,
        room_id: row[i].room_id,
        message: row[i].message,
        send_time: row[i].send_time,
      });
    }
    ret = JSON.stringify(dat);
    // console.log(ret);
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(ret)
  });
  connection.end();
});
module.exports = router
