# REST API on Express

Service with REST API with authorization.
You can make **POST** request - _/signup; /signin_, and
you can make **GET** request - _/latency; /info; /logout_

# Getting started

**1. Install modules**
```bash
$ npm install
```
**2. Configure your database**

- Create database 'users';

- Execute _users.sql_ file;

- Open _db.js_ file and input your details:
```bash
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'users'
```

**3. Run your server**
```bash
node app.js
```