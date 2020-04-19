var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
require('date-utils');
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
 * DBに接続するために必要な情報
 *
 */
var pool = mysql.createPool({
  host : 'localhost',
  user : 'root',
  database: 'sokusasu',
  password: 'Nagachan_0226DB'
});



/**
 * アカウント登録
 *
 */
app.post('/api/regist', function(req, res) {
  const data = req.body.params;
  // 現在時刻取得
  const date = new Date();
  const formattedDate = date.toFormat("YYYY-MM-DD HH24:MI:SS");
  data.created_at = formattedDate
  data.update_at = formattedDate

  pool.getConnection(function(error, connection) {
    if (error) throw error;

    const query = 'insert into Users set ?'
    // 送信されたトークをDBに保存
    connection.query(query, data, function(err, result, fields) {
      if (err) {
        console.log(err);
        res.send(err);
      }
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send('アカウント登録成功')
    });
    connection.release();
  });
});


/**
 * 通常ログイン
 *
 */

const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')

// 認証済みかどうか確認
function checkAuthentication(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('すでに認証済')
    next()
  } else {
    console.log('チョトマテチョとまてオニィさん')
    res.status(204).send() // 認証されてないなら 204 (No Content) を返す
  }
}

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
      pool.getConnection(function(error, connection) {
        if (error) throw error;
    
        const query = 'SELECT * FROM Users WHERE mail= "' + name + '"AND password="' + password + '" LIMIT 1;'
        // 送信されたトークをDBに保存
        connection.query(query, function(err, result, fields) {
          if (err) {
            console.log('ログイン失敗'+err);
            return done(null, false, { message: 'ログイン失敗' });
          }
          if(result != '') {
            console.log('ログイン成功'+JSON.stringify(result[0]))
            const user = result[0];
            return done(null, user);
          }else {
            console.log('メアドかパスワードが間違っています。'+JSON.stringify(result[0]))
            return done(null, false, { message: 'メアドかパスワードが間違っています。' });
          }
        });
        connection.release();
      });
  }
));
app.post('/api/login',
  passport.authenticate('local', { successRedirect: '/#/dashboard', failureRedirect: '/', }),
);
passport.serializeUser(function(user, done) {
  console.log('通常serializeUser:'+JSON.stringify(user))
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  console.log('通常deserializeUser:'+JSON.stringify(user))
  done(null, user);
});


app.get("/api/user", checkAuthentication, function(req, res) {
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
    const user = {}
    // 必要な情報だけ
    user.twitter_id = profile.id
    user.name = profile.displayName
    user.provider = profile.provider
    return done(null, user);
  }
));
passport.serializeUser((user, done) => {
  done(null, user);
  console.log('serializeUser:'+user)
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
  console.log('deserializeUser:'+obj)
});

app.get('/api/auth/twitter', passport.authenticate('twitter'));
app.get('/api/auth/twitter/callback', 
  passport.authenticate('twitter', { successRedirect: '/#/dashboard',failureRedirect: '/login' }), (req, res) => {
  res.json({ user: req.user });
  console.log(req.user)
});



/**
 * お誘い新規作成
 *
 */

app.get('/api/create', function(req, res) {
  let invite_userData = {}
  let inviteData = {}

  // オブジェクトからfriend_user_idを別のobjectに追加後削除
  // 複数のテーブルで値のやりとりがあるが、全てのテーブルで使うわけではないから
  // friend_user_idを使いたいのはinvite_userテーブル
  invite_userData.user_id = req.query.friend_user_id
  delete req.query.friend_user_id
  // お誘い登録時に作成される通番
  let invite_id = 0

  inviteData = req.query;
  // 現在時刻取得
  const date = new Date();
  const formattedDate = date.toFormat("YYYY-MM-DD HH24:MI:SS");
  inviteData.created_at = formattedDate
  inviteData.update_at = formattedDate

  pool.getConnection(function(error, connection) {
    function InvitesQuery(inviteData) {
      return new Promise(function(resolve) {
        connection.query('insert into Invites set ?', inviteData, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          const lastInvite_id = result.insertId
          resolve(lastInvite_id);
        });    
      })
    }
    // 送信されたお誘い情報をDBに保存
    function invite_userQuery(invite_userData) {
      return new Promise(function(resolve) {
        connection.query('insert into invite_user set ?', invite_userData, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          resolve(result);
        });    
      })
    }
    // 誘われたユーザーとお誘い情報を紐づけてDBに保存
    async function InvitesQueryResult() {
      const invite_id = await InvitesQuery(inviteData);

      // 誘われたユーザーとお誘いを紐づけてDBに保存
      invite_userData.invite_id = invite_id   
      invite_userData.created_at = formattedDate
      invite_userData.update_at = formattedDate
      const result = await invite_userQuery(invite_userData);

      return result;
    }
    InvitesQueryResult().then(function(result) {
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send('新しくお誘いしました+誘われたユーザーとの紐付けも完了しました');
      console.log('invite_user紐付け成功')
      console.log('誘われたユーザーid'+invite_userData.user_id)
      console.log('invite_id'+invite_id)
      console.log('room_id'+result.insertId)
    });
  });
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
