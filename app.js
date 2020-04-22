var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
var squel = require("squel");
require('date-utils');
// pasusport.js
var passport = require('passport')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

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
  data.active_status = 0
  data.created_at = formattedDate
  data.update_at = formattedDate

  pool.getConnection(function(error, connection) {
    if (error) throw error;

    // 送信されたトークをDBに保存
    const query = 'insert into Users set ?'
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

        // 送信されたトークをDBに保存
        const query = 'SELECT * FROM Users WHERE mail= "' + name + '"AND password="' + password + '" LIMIT 1;'
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



// ログイン成功後、ユーザーの情報を取得する
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
  let inviteData = {}
  let invite_userData = {}

  // オブジェクトからfriend_user_idを別のobjectに追加後削除
  // 複数のテーブルで値のやりとりがあるが、全てのテーブルで使うわけではないから
  // friend_user_idを使いたいのはinvite_userテーブル
  invite_userData.user_id = req.query.friend_user_id
  delete req.query.friend_user_id

  inviteData = req.query;
  // 現在時刻取得
  const date = new Date();
  const formattedDate = date.toFormat("YYYY-MM-DD HH24:MI:SS");
  inviteData.created_at = formattedDate
  inviteData.update_at = formattedDate

  pool.getConnection(function(error, connection) {
    // 誘ったお誘い情報をDBに保存
    function InvitesQuery(inviteData) {
      return new Promise(function(resolve) {
        connection.query('insert into Invites set ?', inviteData, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          // お誘い登録時に作成される通番
          const lastInvite_id = result.insertId
          resolve(lastInvite_id);
        });    
      })
    }
    // 誘われたユーザーとお誘いを紐づけてDBに保存
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
    async function InvitesQueryResult() {
      const invite_id = await InvitesQuery(inviteData);

      invite_userData.invite_id = invite_id   
      invite_userData.created_at = formattedDate
      invite_userData.update_at = formattedDate
      const result = await invite_userQuery(invite_userData);

      return result;
    }
    InvitesQueryResult().then(function(result) {
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send('新しくお誘いしました+誘われたユーザーとの紐付けも完了しました');
      console.log('Invitesとinvite_user紐付け成功')
      console.log('誘われたユーザーid'+invite_userData.user_id)
      console.log('誘ったユーザーid'+inviteData.user_id)
      console.log('invite_id'+invite_userData.invite_id)
      console.log('invite_user_id'+result.insertId)
    });
  });
});



/**
 * お誘い一覧取得
 *
 */

app.get('/api/inviteList', function(req, res) {
  const user_id = req.query.id
  pool.getConnection(function(error, connection) {
    if (error) throw error;

    // 誘った and 誘われた一覧情報取得
    const query = 'SELECT inviting.* , invited.user_id as target_user_id, invited.answer , user.name as target_user_name FROM Invites as inviting LEFT OUTER JOIN invite_user as invited ON (inviting.id = invited.invite_id ) INNER JOIN Users as user ON ((user.id = inviting.user_id AND invited.user_id = '+user_id+')OR (user.id = invited.user_id AND inviting.user_id = '+user_id+')) WHERE (inviting.user_id = '+user_id+' OR invited.user_id = '+user_id+') AND invited.answer IS NULL AND date_add(CAST(inviting.date AS DATETIME), INTERVAL inviting.start_time HOUR_SECOND) > now() ;'
    connection.query(query, function(err, result, fields) {
      if (err) {
        console.log(err);
      }
      console.log(result)
      res.json(result)
    });
    connection.release();
  });
});



/**
 * お誘い返答
 *
 */

app.get('/api/join', function(req, res) {
  var data = req.query
  var inviteInfo = {}
  // 誘われた人のid
  let invited_user_id = data.user_id
  let invite_id = data.invite_id
  console.log(invited_user_id)
  // ルームのメンバー全員を配列に入れる
  let room_members = []
  room_members.push(invited_user_id)
  // 現在時刻取得
  const date = new Date();
  const formattedDate = date.toFormat("YYYY-MM-DD HH24:MI:SS");
  let created_at = formattedDate
  let update_at = formattedDate
  let RoomsData = {}
  RoomsData.invite_id = invite_id
  RoomsData.created_at = created_at
  RoomsData.update_at = update_at
  let room_userData = {}
  room_userData.created_at = created_at
  room_userData.update_at = update_at

  pool.getConnection(function(error, connection) {
    if (error) throw error;
    // 返答したお誘いの情報を取得
    function getInvitesQuery() {
      return new Promise(function(resolve) {
        connection.query('SELECT user_id as invite_user_id FROM Invites WHERE id='+invite_id, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          // 誘った人のid
          let invite_user_id = result[0].invite_user_id
          console.log('欲しい'+invite_user_id)
          room_members.push(invite_user_id)
          console.log('欲しい2'+room_members)
          // 誘った人のidを次の処理に渡す
          resolve(invite_user_id);
        });    
      })
    }
    // お誘いに参加することをDBに保存
    function inviteJoinQuery() {
      return new Promise(function(resolve) {
        connection.query('UPDATE invite_user SET answer=1 WHERE user_id='+invited_user_id+' AND invite_id='+invite_id, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          resolve(result);
        });    
      })
    }
    // ルーム開設
    function openRoomQuery(RoomsData) {
      return new Promise(function(resolve) {
        connection.query('insert into Rooms set ?', RoomsData, function(err, result, fields) {
          if (err) {
            console.log(err);
          }
          // ルーム開設時に作成される通番
          const room_id = result.insertId
          console.log('ルーーーーーーーーーむ'+room_id)
          room_userData.room_id = room_id;
          resolve(result);
        });    
      })
    }
    // ルームに参加しているメンバーをDBに保存
    function room_userQuery(room_userData) {
      console.log('ルーーーーーーーーーむ２'+JSON.stringify(room_userData))
      return new Promise(function(resolve) {
        room_members.forEach(function( room_member ) {
          console.log( 'room_member'+room_member );
          room_userData.user_id = room_member

          connection.query('insert into room_user set ?', room_userData, function(err, result, fields) {
            if (err) {
              console.log(err);
            }
            resolve(result);
          });
        });
      })
    }
    async function QueryResult() {
      inviteInfo = await getInvitesQuery(invite_id);
      await inviteJoinQuery(invited_user_id, invite_id);
      await openRoomQuery(RoomsData);
      const success = await room_userQuery(room_userData);

      return success;
    }
    QueryResult().then(function(success) {
      res.header('Content-Type', 'application/json; charset=utf-8')
      res.send('ルーム作成まで終了しました');
      console.log(success)
    });

    connection.release();
  });
    // お誘いに参加するのでDBに保存
    // const query = 'UPDATE invite_user SET answer=1 WHERE user_id='+data.user_id+' AND invite_id='+invite_id+';'
    // const query = 'UPDATE invite_user SET answer=1 WHERE user_id='+data.user_id+' AND invite_id='+invite_id+';'
    // const query = 'UPDATE invite_user SET answer=1 WHERE user_id='+data.user_id+' AND invite_id='+invite_id+';'
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
