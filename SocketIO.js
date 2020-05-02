var app = require('./app');
var http = require('http');
var server = http.createServer(app);
//sessionMiddlewareの取り出し
var sessionMiddleware = app.session;

/**
 * チャット機能
 *
 */

//サーバーをlistenしてsocketIOを設定
var io = require('socket.io')(server);

//socketIOモジュール
function socketIO(){
  // //サーバーを立ち上げたら実行
  server.listen(app.get('port'), function() {
    console.log('3000番：listening!!!');
  });

  //socket処理を記載する
  io.sockets.on('connection', function(socket) {
    console.log(`a user connected[id:${ socket.id }]`)

    // クライアントから送られて来たルーム値でルームを開設
    var room = "";
    socket.on("from_client", function(data) {
        room = data.value;
        console.log("クライアントから送信されたroom: %s", room);
        // ユーザーをルームに参加させる
        socket.join(room);
        // ユーザに新しいルームに入ったことを知らせる
        io.sockets.emit('joinResult', { room: room });
    });

    socket.on('POST_MESSAGE', function(data) {
      console.log(`posted[name:${ data.name },body:${ data.body }]`)
      io.sockets.to(room).emit('MESSAGE', data)
      io.sockets.emit('CURRENT_MESSAGE', data)
    });
  })
};


//export
module.exports = socketIO;