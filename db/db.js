const mysql = require('mysql');

const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '121212',
	database : 'users'
});

connection.connect(function(err) {
	if (err) throw err;
});

module.exports = connection;