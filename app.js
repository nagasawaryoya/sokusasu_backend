var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
// pasusport.js
const passport = require('passport')

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
 * ルーティング
 *
 */
// const ALLOWED_METHODS = [
//   'GET',
//   'POST',
//   'PUT',
//   'PATCH',
//   'DELETE',
//   'HEAD',
//   'OPTIONS'
// ];

// const ALLOWED_ORIGINS = [
//   'https://127.0.0.1:3000',
//   'https://127.0.0.1:3001'
// ];



/**
 * 通常ログイン
 *
 */

const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy

//エラー用フラッシュメッセージのモジュールを設定
var flash = require('connect-flash');
app.use(flash());
app.use(cookieSession({
  name: 'mysession',
  keys: ['vueauthrandomkey'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(bodyParser.json())
app.use(passport.initialize());
app.use(passport.session());

app.post("/api/login", (req, res, next) => {
  passport.authenticate("local",
    req.login(req.body, function (err) {
    if (err) { 
      res.send('これもダメ')
    }
    res.send("Logged in");
  }));
});
passport.use(
	new LocalStrategy(
		{
			usernameField: 'email', 
			passwordField: 'password'
		},
		function(username, password, done) {
			if(username == 'user@email.com' && password == 'password'){
        //ログイン成功
        console.log('ログイン成功')
        return done(null, username);
			}
      //ログイン失敗
      console.log('ログイン失敗')
      return done(null, false, {message:'ID or Passwordが間違っています。'});
		}
));

// const authMiddleware = (req, res, next) => {
//   console.log(req.isAuthenticated())
//   if (!req.isAuthenticated()) {
//     res.status(401).send('You are not authenticated')
//   } else {
//     return next()
//   }
// }
app.get("/api/user", function(req, res) {
  console.log('mypage↓↓↓↓↓');
  // console.log(req.user);
  if(req.user){
    res.send({ user: req.user })
  } else {
    res.send({user: 'ログインできません'})
  }
})

passport.serializeUser(function(username, done) {
	console.log('serializeUser');
	done(null, username);
});

passport.deserializeUser(function(username, done) {
	console.log('deserializeUser');
	done(null, {name:username, msg:'my message'});
});

//ログアウト
app.get('/api/logout', function(req, res, next) {
	req.logout();
	// res.redirect('/');
});



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
    // console.log('認証後' + token, tokenSecret, profile);
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
