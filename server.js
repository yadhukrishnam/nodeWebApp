var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var session = require('express-session')
var conn = require('./config');
var formidable = require('formidable');
var fs = require('fs');
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(session({ secret: 'sup3rs3cr3t' }));
app.set('view engine', 'pug');
app.set('views', './views');
app.use(express.static('static'))
app.use(express.static('uploads'))
/* BEGIN MESSAGING */

app.get('/uploads/:file', function(req, res) {
    res.sendFile(__dirname + '/uploads/'+ req.params.file)
})

app.get('/chat/@:pair', function (req, res) {
    if (req.session.isLogged) {
        if (conn.query("SELECT * FROM messages WHERE (senderId=(SELECT id FROM users WHERE uname=?))",
        [req.params.pair, req.session.UserId, req.session.UserId, req.params.pair],
         function (err, rows, fields) {

            if (rows.length > 0) {
                var msgs = [];

                for (var i = 0; i < rows.length; i++) {
                    var message = {
                        'from': req.params.pair,
                        'msg': rows[i].msg,
                        'sender': rows[i].senderId,
                        'msgId': rows[i].id,
                    }
                    
                    msgs.push(message)
                }

                res.render('message_view', {
                    messages: msgs,
                    UserId: req.session.UserId,
                    uname: req.session.uname,
                    pairName: req.params.pair
                })
            } else {
                res.render('message_view', {
                    pairName: req.params.pair,
                    uname: req.session.uname
                })
            }
        })) { }

    } else {
        res.redirect("/login")
    }
});

app.post('/dashboard', function (req, res) {    
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        var oldpath = files.filetoupload.path;
        var filePath = "/uploads/" + Date.now() + ".png"
        var newpath = __dirname + filePath;
        fs.rename(oldpath, newpath, function (err) {
            if (!err) {
                if(conn.query("insert into messages(senderId,msg) VALUES (?, ?) ",
                    [req.session.UserId, filePath], function (err, results, fields) {
                        console.log(err, results) 
                    })) {
                    }
            };
            res.end();
        });
    })
    res.redirect('/dashboard')
})

app.get('/delete/uploads/:file', function (req, res) {
    if(conn.query("DELETE FROM messages WHERE msg = ? AND senderId= ?",
        ['/uploads/'+req.params.file, req.session.UserId], function (err, results, fields) {
            console.log(err, results)
            if (results.affectedRows == 1) {
                try {
                    fs.unlinkSync(__dirname + '/uploads/' + req.params.file)
                  } catch(err) {
                    console.error(err)
                  }
            }
            res.redirect('/dashboard')
        })) {

        }
}) 
/* END MESSAGING */

/* LOGIN AND REGISTER */

app.get('/', function (req, res) {
    if (!req.session.isLogged)
        res.render('login_view')
    else
        res.redirect('/dashboard')
})

app.get('/login', function (req, res) {
    if (!req.session.isLogged)
        res.render('login_view')
    else
        res.redirect('/dashboard')
})

app.post('/login', urlencodedParser, function (request, response) {
    var uname = request.body.uname
    var passwd = request.body.passwd

    if (uname && passwd) {
        conn.query('SELECT * FROM users WHERE uname = ? AND passwd = ?', [uname, passwd], function (error, results, fields) {
            if (results.length > 0) {
                request.session.isLogged = true;
                request.session.uname = uname;
                request.session.email = results[0].email
                request.session.UserId = results[0].id
                response.redirect('/dashboard');
            } else {
                console.log(error);
                response.render('login_view',
                    { error: 'Incorrect Username and/or Password!' }
                );
            }
            response.end();
        });
    } else {
        response.render('login_view',
            { error: 'Please enter Username and Password!' }
        );
        response.end();
    }

});

app.get('/logout', function (req, res) {
    req.session.destroy()
    res.render('login_view', {
        error: "Logged out"
    })
})

app.get('/register', function (req, res) {
    res.render('register_form')
})

/* END LOGIN REGISTER */

/* BEGIN DASHBOARD */

app.get('/css', function (req, res) {
    console.log("A");
    res.sendFile(__dirname + '/static/css/style.css')
});

app.get('/dashboard', function (req, res) {
    if (req.session.isLogged) {
        if (conn.query('SELECT * FROM users', function (err, rows, fields) {
            if (err) {
                res.status(500).json({ "status_code": 500, "status_message": "internal server error" });
            } else {
                var PersonData = [];

                for (var i = 0; i < rows.length; i++) {
                    var details = {
                        'id': rows[i].id,
                        'uname': rows[i].uname
                    }

                    PersonData.push(details)
                }

                res.render('dashboard_view', {
                    uname: req.session.uname,
                    data: PersonData
                })

            }
        }));

    } else {
        res.render('login_view', {
            error: "You must login to continue."
        })
    }
})

/* END DASHBOARD */

/* BEGIN PROFILE */

app.get('/viewPerson/@:id', function (req, res) {
    if (req.session.isLogged) {
        if (conn.query('SELECT * FROM users WHERE uname=?', [req.params.id], function (err, rows, fields) {
            if (err) {
                res.status(500).json({ "status_code": 500, "status_message": "internal server error" });
            } else {
                var PersonData = [];

                for (var i = 0; i < rows.length; i++) {
                    var details = {
                        'id': rows[i].id,
                        'uname': rows[i].uname,
                        'email': rows[i].email,

                    }

                    PersonData.push(details)
                }

                res.render('viewPerson_view', {
                    uname: req.session.uname,
                    Person: PersonData
                })

            }
        }));

    } else {
        res.render('login_view', {
            error: "You must login to continue."
        })
    }
})

app.get('/editProfile', function (req, res) {
    if (req.session.isLogged) {
        res.render('editProfile_view', {
            uname : req.session.uname,
            person: {
                'uname': req.session.uname,
                'email': req.session.email
            }
        })
    } else {
        res.render('login_view', {
            error: "You must login to continue."
        })
    }
})

app.post('/saveProfile', urlencodedParser, function (req, res) {
    if (req.session.isLogged) {
        var uname = req.body.uname
        var email = req.body.email
        var id = req.session.UserId
        if (conn.query("UPDATE users SET uname=?, email=? WHERE id=?", [uname, email, id], function (err, results, fields) {
            if (err) {

                res.render('editProfile_view', {
                    person: {
                        'uname': uname,
                        'email': email
                    },
                    message: "Something went wrong."

                })
            } else {
                req.session.uname = req.body.uname
                req.session.email = req.body.email
                console.log("Updated")
                res.render('editProfile_view', {
                    person: {
                        'uname': uname,
                        'email': email
                    },
                    message: "Profile Updated."
                })
            }

        }

        )) { }
    }
})


app.post('/register', urlencodedParser, function (req, res) {
    var data = {
        uname: req.body.uname,
        email: req.body.email,
        passwd: req.body.passwd
    }
    var errorMsg = ""
    if (req.body.passwd === req.body.passwdConf) {
        if (conn.query("INSERT INTO users (uname, passwd, email) VALUES (?,?,?)", [data.uname, data.passwd, data.email], function (err, res, field) {
            console.log(err, res, field)
            if (err)
                return false
            return true
        })) {
            res.render('login_view', {
                error: "New user added."
            })
        } else {
            res.render('register_form', {
                msg: "Unable to add user."
            })
        }
    } else {
        res.render('register_form', {
            msg: "Password Mismatch"
        })
    }
})
/* END PROFILE */

var server = app.listen(8080, function () { })
