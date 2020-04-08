var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
// pasusport.js
var passport = require('passport')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var talksRouter = require('./public/javascripts/db');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * ルーティング
 *
 */

app.use('/', indexRouter);
app.use('/users', usersRouter);
// talksテーブル接続　（練習）
app.use('/db', talksRouter)



/**
 * 
 *
 */



/**
 * 通常ログイン
 *
 */

const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
app.use(session({
  secret: 'keyboard cat',
  name: 'cookie_name',
  // store: 'sessionStore', // connect-mongo session store
  cookie: { maxAge: 60000 },
  proxy: true,
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize()) //Expressを使用している場合はInitializeが必要
app.use(passport.session())

passport.use(new LocalStrategy(
  function(name, password, done) {
    var user = { name: name, password: password};// TODO 一旦ハードコーディング
    if(user) {
      if (user.name !== '1') {// TODO 一旦ハードコーディング
        console.log('ユーザーIDが間違っています')
        return done(null, false, { message: 'ユーザーIDが間違っています。' });
      }
      if (user.password !== 'password') {// TODO 一旦ハードコーディング
        console.log('パスワードが間違っています。')
        return done(null, false, { message: 'パスワードが間違っています。' });
      }
      console.log('成功')
      return done(null, user);
    };
  }
));
app.post('/api/login',
  passport.authenticate('local', { successRedirect: '/#/dashboard', failureRedirect: '/', }),
);
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


app.get("/api/user", function(req, res) {
  console.log('mypage↓↓↓↓↓');
  if(req.user){
    res.send({ user: req.user })
  } else {
    res.send({user: 'ログインできません'})
  }
})



/**
 * twitterログイン
 *
 */

TwitterStrategy = require('passport-twitter').Strategy;

passport.use(new TwitterStrategy({
    consumerKey: 'e3CLTp8r6RMBBp1YEod2XgsTv',
    consumerSecret: 'LC0PAt8RER2pkD252hJzrJbyvyEN1zT8BanmtN4Fgzkvr52Xt6',
    callbackURL: "http://localhost:8080/api/auth/twitter/callback"
  },
  // 認証後の処理
  function(token, tokenSecret, profile, done) {
    return done(null, profile);
  }
));
passport.serializeUser((user, done) => {
  console.log('serializeUser');
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  console.log('deserializeUser');
  done(null, obj);
});

app.get('/api/auth/twitter', passport.authenticate('twitter'));
app.get('/api/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: '/#/dashboard',failureRedirect: '/login' }), (req, res) => {
  res.json({ user: req.user });
  console.log(req.user)
});



/**
 * トーク画面から渡されるメッセージ取得 axios
 *
 */
app.get('/api/hoge', (req, res) => {
  // メッセージ
  var data = req.query;
  console.log(data);

  var connection = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    database: 'untakecourage',
    password: 'Nagachan0226DB_'
  });

  // 接続
  connection.connect();
  // 送信されたトークをDBに保存
  connection.query('insert into talks set ?', data, function(err, res) {
    if (err) {
      console.log(err);
    }
    // console.log(data.value);

    // ret = JSON.stringify(data.value);
    // console.log(ret);
    // res.header('Content-Type', 'application/json; charset=utf-8')
    // res.send(ret)
  });
  // DBに保存したメッセージをトーク画面に表示
  connection.query('select * from talks WHERE room_id = 1 ORDER BY id DESC LIMIT 1;', function(error, row, fields){
    if (error) {
      console.log('だめだこりゃ:' + error);
    }
    // console.log('DBから渡されたデータ： ' + row)
    var sendMessage = JSON.stringify(row); // string
    console.log('これはどう？： '+typeof sendMessage)
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.json(sendMessage)
  });
  connection.end();

  // res.json(req.query)
});



// =============================================
// =============================================
// =============================================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
