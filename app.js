const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./db/db');
const jwt = require('jsonwebtoken');
const req = require('request');
const secretKey = 'kaiurin';
const urlencodedParser = bodyParser.urlencoded({extended: false});
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(function (request, response, next) {
	response.header("Access-Control-Allow-Origin", "*");
	response.header("Access-Control-Allow-Methods", "GET, POST");
	response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next()
});

app.post("/signup", urlencodedParser, function (request, response) {
	if (!request.body) return response.sendStatus(400);
	let id = request.body.id;
	let password = request.body.password;
	if (validateId(id)) {
		db.query('SELECT id FROM accounts WHERE id = ?', [id], function (err, res) {
			if (err) {
				response.json({
					status: 500,
					err
				})
			} else if (res.length) {
				response.json({
					message: 'ID already used',
				})
			} else {
				bcrypt.hash(password, saltRounds, function (err, hash) {
					if (err) {
						response.json({
							status: 500,
							err
						})
					} else {
						db.query('INSERT INTO accounts (id, password) VALUES(?, ?)', [id, hash], function (err) {
							if (err) {
								response.json({
									status: 500,
									err
								})
							} else {
								jwt.sign({id}, secretKey, (err, token) => {
									if (err) return response.json({err});
									let timestamp = Math.floor(Date.now() / 1000) + (60 * 10);
									db.query('INSERT INTO tokens (token, timestamp, id) VALUES(?, ?, ?)', [token, timestamp, id], function (err) {
										if (err) {
											response.json({
												status: 500,
												err
											})
										} else {
											response.json({
												message: 'You are successfully registered!',
												token
											})
										}
									});
								});
							}
						})
					}
				});
			}
		});
	} else {
		response.json({
			status: 400,
			message: 'Invalid login format!'
		})
	}
});

app.post("/signin", urlencodedParser, function (request, response) {
	if (!request.body) return response.sendStatus(400);
	let id = request.body.id;
	let password = request.body.password;
	db.query('SELECT id, password FROM accounts WHERE id = ?', [id], function (err, res) {
		if (err) {
			response.json({
				status: 500,
				err
			})
		} else if (res.length) {
			let dbHash = res[0].password;
			bcrypt.compare(password, dbHash, function (err, res) {
				if (err) {
					response.json({
						status: 500,
						err
					})
				} else if (res) {
					jwt.sign({id}, secretKey, (err, token) => {
						if (err) return response.json({err});
						let timestamp = Math.floor(Date.now() / 1000) + (60 * 10);
						db.query('INSERT INTO tokens (token, timestamp, id) VALUES(?, ?, ?)', [token, timestamp, id], function (err) {
							if (err) {
								response.json({
									status: 500,
									err
								})
							} else {
								response.json({
									message: 'You are successfully authorized!',
									token
								})
							}
						});
					});
				} else {
					response.json({
						message: 'Wrong login or password!'
					});
				}
			});
		} else {
			response.json({
				message: 'Wrong login or password!'
			});
		}
	})
});

app.get("/latency", verifyToken, function (request, response) {
	jwt.verify(request.token, secretKey, (err) => {
		if (err) {
			response.json({
				status: 500,
				err
			});
		} else {
			checkAndUpdateToken(request.token, (error, result) => {
				if (error) {
					response.json({
						status: 500,
						error
					});
				} else if (!result) {
					response.json({
						status: 403,
						message: 'Token has been expired!'
					});
				} else {
					let url = 'http://google.com';
					req.get({
						url,
						time: true
					}, function (err, res) {
						if (err) {
							response.json({
								status: 500,
								err,
							});
						} else {
							response.json({
								resource: url,
								latency: res.elapsedTime,
							});
						}
					});
				}
			});
		}
	});
});

app.get("/info", verifyToken, function (request, response) {
	jwt.verify(request.token, secretKey, (err) => {
		if (err) {
			response.json({
				status: 403,
				err
			});
		} else {
			checkAndUpdateToken(request.token, (error, result) => {
				if (error) {
					response.json({
						status: 500,
						error
					});
				} else if (!result) {
					response.json({
						status: 403,
						message: 'Token has been expired'
					});
				} else {
					db.query('SELECT id FROM tokens WHERE token = ?', [request.token], function (err, res) {
						if (err) {
							response.json({
								status: 500,
								err
							})
						} else {
							response.json({
								id: res[0].id
							});
						}
					})
				}
			});
		}
	});
});

app.get("/logout", verifyToken, function (request, response) {
	jwt.verify(request.token, secretKey, (err) => {
		if (err) {
			response.json({
				status: 403,
				err
			});
		} else {
			checkAndUpdateToken(request.token, (error, result) => {
				if (error) {
					response.json({
						status: 500,
						error
					});
				} else if (!result) {
					response.json({
						status: 403,
						message: 'Token has been expired!'
					});
				} else {
					deleteToken(request.token, (err) => {
						if (err) {
							response.json({
								status: 500,
								err
							})
						} else {
							response.json({
								message: 'You are successfully logged out!',
							})
						}
					});
				}
			});
		}
	});
});

app.get("/", function (request, response) {
	response.send("Welcome to REST-API");
});

function verifyToken(req, res, next) {
	const bearerHeader = req.headers['authorization'];
	if (typeof bearerHeader !== 'undefined') {
		const bearer = bearerHeader.split(' ');
		const bearerToken = bearer[1];
		req.token = bearerToken;
		next();
	} else {
		res.sendStatus(401);
	}
}

function validateId(id) {
	let email = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
	let number = /^[+]*[(]{0,1}[0-9]{1,3}[)]{0,1}[-\s\./0-9]*$/;
	return email.test(id) || number.test(id);
}

function checkAndUpdateToken(token, cb) {
	db.query('SELECT timestamp FROM tokens WHERE token = ?', [token], function (err, res) {
		if (res.length) {
			let dateNow = Math.floor(Date.now() / 1000);
			let expDate = res[0].timestamp;
			if (expDate < dateNow) {
				deleteToken(token, (err) => {
					cb(err)
				});
			} else {
				extendToken(token, (err) => {
					cb(err, true)
				});
			}
		} else {
			if (err) {
				cb(err)
			} else {
				cb("Token doesn't found")
			}
		}
	});
}

function extendToken(token, cb) {
	let expDate = Math.floor(Date.now() / 1000) + (60 * 10);
	db.query('UPDATE tokens SET timestamp = ? WHERE token = ?', [expDate, token], function (err) {
		cb(err)
	});
}

function deleteToken(token, cb) {
	db.query('DELETE FROM tokens WHERE token = ?', [token], function (err) {
		cb(err)
	});
}

app.listen(3000);
