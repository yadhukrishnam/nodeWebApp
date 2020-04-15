var mysql = require('mysql')
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'toor',
    password: 'toor',
    database: 'NodeCMS'
})
connection.connect(function (err) {
    if (err) console.log(err)
})
module.exports = connection