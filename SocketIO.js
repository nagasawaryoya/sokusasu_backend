var app = require('./app');
var http = require('http');
var server = http.createServer(app);

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
    socket.on('POST_MESSAGE', function(data) {
      console.log(`posted[name:${ data.name },message:${ data.message }]`)
      io.sockets.emit('MESSAGE', data)
    });
  })
};

//export
module.exports = socketIO;